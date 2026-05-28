"use client";

const DOT_COUNT = 25;
const BAR_H = 14;

// positions and userPosition are 0–100 (matching DB storage)
interface Props {
  positions: number[];
  userPosition: number | null;
  thumbnailUrl: string | null;
  avatarSize: string; // CSS value e.g. "60px"
  secondaryPosition?: number | null;       // optional second avatar (e.g. viewer on someone else's page)
  secondaryThumbnailUrl?: string | null;
}

export function ContinuumPreviewBar({ positions, userPosition, thumbnailUrl, avatarSize, secondaryPosition, secondaryThumbnailUrl }: Props) {
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
          // dot position as 0-100
          const dotPos = (i / (DOT_COUNT - 1)) * 100;
          const nearParticipant = positions.some(
            (p) => Math.abs(p - dotPos) < (100 * 0.6) / DOT_COUNT
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

      {/* Primary avatar */}
      {userPosition !== null && thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          style={{
            position: "absolute",
            bottom: BAR_H - 6,
            left: `calc(${userPosition}% - calc(${avatarSize} / 2))`,
            width: avatarSize,
            height: avatarSize,
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Secondary avatar (viewer on someone else's page) */}
      {secondaryPosition != null && secondaryThumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={secondaryThumbnailUrl}
          alt=""
          style={{
            position: "absolute",
            bottom: BAR_H + 2,
            left: `calc(${secondaryPosition}% - calc(${avatarSize} / 2))`,
            width: `calc(${avatarSize} * 0.75)`,
            height: `calc(${avatarSize} * 0.75)`,
            objectFit: "contain",
            pointerEvents: "none",
            opacity: 0.7,
          }}
        />
      )}
    </div>
  );
}
