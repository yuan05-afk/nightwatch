"""Copy reports/*.json into the web app so the site and deck read the same numbers."""

import shutil

from .data import ML_ROOT

DEST = ML_ROOT.parent / "web" / "content" / "reports"

if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    for f in sorted((ML_ROOT / "reports").glob("*.json")):
        shutil.copy2(f, DEST / f.name)
        print("synced", f.name)
