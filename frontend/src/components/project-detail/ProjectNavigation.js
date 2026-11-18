// frontend/src/components/project-detail/ProjectNavigation.js — responsive workspace tabs
const TAB_ICONS = {
  overview: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  tasks: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3.5 6l1.3 1.3L7 5M3.5 12l1.3 1.3L7 11M3.5 18l1.3 1.3L7 17" /></>,
  board: <><rect x="3.5" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="10" rx="1.5" /><rect x="16.5" y="4" width="4" height="13" rx="1.5" /></>,
  team: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.5-3.2 3-5 6-5s5.5 1.8 6 5" /><circle cx="17" cy="9.5" r="2.5" /><path d="M17.5 14.5c2.3.2 3.9 1.7 4.3 4" /></>,
  deliverables: <><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" /><path d="M4 7.2L12 11.5l8-4.3M12 11.5V21" /></>,
  timeline: <path d="M4 6h8M8 12h10M6 18h9" />,
  activity: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
};

export default function ProjectNavigation({ activeSection, onSelect, sections }) {
  return (
    <nav className="project-detail-navigation" role="tablist" aria-label="เมนูโปรเจกต์">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          role="tab"
          className={`project-detail-nav-button ${activeSection === section.key ? 'active' : ''}`}
          aria-selected={activeSection === section.key}
          aria-label={section.count !== null && section.count !== undefined ? `${section.label} ${section.count}` : section.label}
          onClick={() => onSelect(section.key)}
        >
          <svg className="project-detail-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {TAB_ICONS[section.key]}
          </svg>
          <span>{section.label}</span>
          {section.count !== null && section.count !== undefined && (
            <span className="project-detail-nav-count">{section.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
