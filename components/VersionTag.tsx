export default function VersionTag() {
  const version = process.env.APP_VERSION;

  if (!version) return null;

  return (
    <span
      style={{
        position: "fixed",
        right: 8,
        bottom: 4,
        fontSize: 12,
        color: "#000",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {version}
    </span>
  );
}
