"use client";

import AlertSettings from "@/components/settings/AlertSettings";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[14px] font-mono font-semibold text-[#E6EDF3] mb-1">Account Settings</h1>
        <p className="text-[11px] text-[#8B949E] font-mono">Alerts · Billing · Security</p>
      </div>

      <AlertSettings />
    </div>
  );
}
