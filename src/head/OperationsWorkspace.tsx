import React, { useState } from 'react';
import { Network, Users, Clock3 } from 'lucide-react';
import type { DepartmentKey, SectionKey } from './departments';
import { ShiftManagementDashboard } from './shifts/ShiftManagementDashboard';
import { GroupManagementDashboard } from './groups/GroupManagementDashboard';
import { RolesDashboard } from './roles/RolesDashboard';
import type { WmTeamGroup } from './services/operationsStore';

type Props = {
  department: DepartmentKey;
  section?: SectionKey | null;
  testToken?: string | null;
  initialGroup?: WmTeamGroup | null;
  coHeads?: Array<{ user_id: string; full_name: string; email: string; account_role?: string | null; team?: string | null; section?: string | null; phone?: string | null; gender?: string | null }>;
};

type Tab = 'hierarchy' | 'groups' | 'shifts';

const tabs: { id: Tab; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'hierarchy', label: 'Hierarchy', description: 'Create positions and assign team members.', icon: <Network size={17} /> },
  { id: 'groups', label: 'Team groups', description: 'Organize people into working groups.', icon: <Users size={17} /> },
  { id: 'shifts', label: 'Shifts', description: 'Schedule coverage and assign shifts.', icon: <Clock3 size={17} /> },
];

export const OperationsWorkspace: React.FC<Props> = ({ department, section, testToken, initialGroup, coHeads = [] }) => {
  const [tab, setTab] = useState<Tab>(initialGroup ? 'shifts' : 'hierarchy');
  const [selectedGroupForShift, setSelectedGroupForShift] = useState<WmTeamGroup | null>(initialGroup || null);
  const departmentLabel = department === 'media_press' ? 'Media & Press' : department === 'security' ? 'Security' : department === 'volunteers' ? 'Volunteers' : department.replace(/_/g, ' ');

  React.useEffect(() => {
    if (initialGroup) {
      setSelectedGroupForShift(initialGroup);
      setTab('shifts');
    }
  }, [initialGroup]);

  return (
    <section className="space-y-5 text-white">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#17150e] via-[#101014] to-[#0a0a0d] p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#d4af37]">WEST MUN · Team operations</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {department === 'media_press' ? 'Media & Press' : departmentLabel} Workspace
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
          Everything you need, in three places. Build your team hierarchy, organize groups, and manage shifts.
        </p>
        <nav aria-label="Team operations" className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setTab(item.id)}
                className={`flex min-h-[76px] items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${active ? 'border-[#d4af37]/60 bg-[#d4af37]/10 text-white' : 'border-white/10 bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.05]'}`}
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-[#d4af37]/15 text-[#e8cb6a]' : 'bg-white/[0.05] text-neutral-400'}`}>{item.icon}</span>
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-neutral-400">{item.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      {tab === 'hierarchy' && (
        <RolesDashboard
          department={department}
          section={section}
          departmentLabel={departmentLabel}
          testToken={testToken || null}
          coHeads={coHeads}
        />
      )}

      {tab === 'groups' && (
        <GroupManagementDashboard
          department={department}
          section={section}
          testToken={testToken || null}
          onAssignGroupToShift={(group) => {
            setSelectedGroupForShift(group);
            setTab('shifts');
          }}
        />
      )}

      {tab === 'shifts' && (
        <ShiftManagementDashboard
          department={department}
          section={section}
          testToken={testToken || null}
          initialGroup={selectedGroupForShift}
        />
      )}
    </section>
  );
};
