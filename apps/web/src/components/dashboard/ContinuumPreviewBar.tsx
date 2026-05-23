"use client";

const DOT_COUNT = 25;
const BAR_H = 14;

interface Props {
  positions: number[];
  userPosition: number | null;
  thumbnailUrl: string | null;
  avatarSize: string; // CSS value e.g. "clamp(60px, ...)"
}

export function ContinuumPreviewBar({ positions, userPosition, thumbnailUrl, avatarSize }: Props) {
  return (
    <div style={{ position: "relative", width: "100%", height: `calc(${avatarSize} + ${BAR_H}px)` }}>
      {/* Dots bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: BAR_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: `calc(${avatarSize} / 2)`,
        paddingRight: `calc(${avatarSize} / 2)`,
        boxSizing: "border-box",
      }}>
        {Array.from({ length: DOT_COUNT }).map((_, i) => {
          const frac = i / (DOT_COUNT - 1);
          const nearParticipant = positions.some(
            (p) => Math.abs(p - frac) < 0.6 / DOT_COUNT
          );
          const isMajor = i % 5 === 0;
          return (
            <div
              key={i}
              style={{
                width: isMajor ? 5 : 3,
                height: isMajor ? 5 : 3,
                borderRadius: "50%",
                background: nearParticipant ? "#777" : "#ccc",
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      {/* User avatar at their position */}
      {userPosition !== null && thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          style={{
            position: "absolute",
            bottom: BAR_H - 6,
            left: `calc(${userPosition * 100}% - calc(${avatarSize} / 2))`,
            width: avatarSize,
            height: avatarSize,
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
