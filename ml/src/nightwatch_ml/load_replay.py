"""Load replay.parquet into Neon `flows_replay` with COPY. Reads DATABASE_URL from web/.env.local."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import psycopg

from .data import ML_ROOT

ENV = ML_ROOT.parent / "web" / ".env.local"


def database_url() -> str:
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL="):
            # direct (non-pooler) host for COPY
            return line.split("=", 1)[1].strip().replace("-pooler", "")
    raise RuntimeError("DATABASE_URL missing from web/.env.local")


def main(path: Path = ML_ROOT / "data" / "out" / "replay.parquet") -> None:
    df = pd.read_parquet(path)
    cols = ["scenario", "seq", "ts", "src_ip", "dst_ip", "src_port", "dst_port", "protocol", "features", "label", "family"]
    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        cur.execute("TRUNCATE flows_replay RESTART IDENTITY CASCADE")
        with cur.copy(f"COPY flows_replay ({', '.join(cols)}) FROM STDIN") as copy:
            for r in df.itertuples(index=False):
                copy.write_row((r.scenario, int(r.seq), r.ts.to_pydatetime(), r.src_ip, r.dst_ip, int(r.src_port),
                                int(r.dst_port), int(r.protocol), [float(v) for v in r.features], r.label, r.family))
        cur.execute("SELECT scenario, count(*), count(*) FILTER (WHERE label <> 'BENIGN') FROM flows_replay GROUP BY 1 ORDER BY 1")
        for row in cur.fetchall():
            print(row)


if __name__ == "__main__":
    main()
