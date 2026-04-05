import { PlusOutlined } from "@ant-design/icons";

interface FABProps {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed z-50 flex items-center justify-center rounded-full border-none cursor-pointer shadow-lg active:scale-95 transition-transform"
      style={{
        width: 56,
        height: 56,
        right: 16,
        bottom:
          "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)",
        backgroundColor: "#52c41a",
        color: "#fff",
        fontSize: 24,
      }}
    >
      <PlusOutlined />
    </button>
  );
}
