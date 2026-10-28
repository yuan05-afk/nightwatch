// Plain-language names for flow features, each paired with an innocent reason the same
// signal shows up in normal traffic. Every driver on an evidence card shows both.

type Rule = { test: RegExp; name: string; benign: string };

const RULES: Rule[] = [
  { test: /dst_port/, name: "Destination port", benign: "Common service ports carry mostly normal traffic; the port alone proves little." },
  { test: /protocol/, name: "Protocol", benign: "TCP and UDP are both everywhere in normal traffic." },
  { test: /init_win/, name: "TCP window size", benign: "Window sizes differ by operating system and network stack." },
  { test: /(syn|rst|fin|psh|ack|urg|cwr|ece)_flag/, name: "TCP flag pattern", benign: "Resets and half-open connections also come from timeouts, firewalls and flaky Wi-Fi." },
  { test: /iat/, name: "Gaps between packets", benign: "Interactive sessions, polling and keep-alives produce irregular gaps." },
  { test: /(packets_s|bytes_s|bulk_rate)/, name: "Traffic rate", benign: "Backups, updates and video calls also move data quickly." },
  { test: /duration|tcp_flow_time|active|idle/, name: "Connection timing", benign: "Long-lived connections are normal for streaming, SSH sessions and keep-alives." },
  { test: /bwd.*(length|bytes|segment)|length_of_bwd/, name: "Bytes the server sent back", benign: "Small responses are normal for redirects, errors and health checks." },
  { test: /fwd.*(length|bytes|segment)|length_of_fwd/, name: "Bytes the client sent", benign: "Upload size depends entirely on the application." },
  { test: /packet_length|packet_size|segment_size/, name: "Packet sizes", benign: "Packet size depends heavily on the application." },
  { test: /(total_fwd_packet|total_bwd_packets|subflow|act_data)/, name: "Packet count", benign: "Busy but legitimate sessions send many packets too." },
  { test: /header_length/, name: "Header overhead", benign: "Header size changes with TCP options, not intent." },
  { test: /icmp/, name: "ICMP details", benign: "Ping and path-MTU discovery use ICMP routinely." },
  { test: /down_up_ratio/, name: "Download to upload ratio", benign: "Browsing is download-heavy; backups are upload-heavy." },
];

export function explainFeature(feature: string): { name: string; benign: string } {
  const key = feature.replace(/^f_/, "");
  const rule = RULES.find((r) => r.test.test(key));
  const pretty = key.replace(/_/g, " ");
  return rule ? { name: `${rule.name} (${pretty})`, benign: rule.benign } : { name: pretty, benign: "This value also varies widely in normal traffic." };
}
