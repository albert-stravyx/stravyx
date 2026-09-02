import { Tab, TABS } from "./customerHomeData";

export function MobileTabBar({
  activeTab,
  setActiveTab,
  unreadNotifications,
}: {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  unreadNotifications: number;
}) {
  return (
    <div
      className="md:hidden flex-shrink-0 bg-white border-t border-[#e8e8e8] flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        const badge = id === "notifications" ? unreadNotifications : 0;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
          >
            <div className="relative">
              <Icon size={24} style={{ color: isActive ? "#5cb89c" : "#b0b0b0" }} strokeWidth={isActive ? 2.2 : 1.8} />
              {badge > 0 && (
                <div className="absolute -top-1.5 -right-2 w-4 h-4 bg-[#d85a30] rounded-full flex items-center justify-center">
                  <span className="text-white" style={{ fontSize: "9px", fontWeight: 700 }}>{badge}</span>
                </div>
              )}
            </div>
            <span
              className="text-[10px]"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: isActive ? 600 : 400, color: isActive ? "#5cb89c" : "#b0b0b0" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
