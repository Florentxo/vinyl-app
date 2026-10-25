import { colors } from "../../../theme"
import type { DiscogsTrack } from "../utils/discogs"

export default function Tracklist({ tracks }: { tracks: DiscogsTrack[] }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "13px" }}>
      {tracks.map((track, index) => (
        <li key={index} style={{ padding: "8px 0", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
            <span style={{ color: colors.textTertiary }}>{track.position}</span>
            <span style={{ flex: 1, fontWeight: track.type_ === "heading" ? "bold" : "normal" }}>{track.title}</span>
            {track.duration && <span style={{ color: colors.textTertiary }}>{track.duration}</span>}
          </div>
          {track.sub_tracks && <Tracklist tracks={track.sub_tracks} />}
        </li>
      ))}
    </ul>
  )
}
