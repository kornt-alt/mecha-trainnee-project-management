// frontend/src/components/project-detail/ProjectNavigation.js — responsive workspace tabs
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
          <span>{section.label}</span>
          {section.count !== null && section.count !== undefined && (
            <span className="project-detail-nav-count">{section.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
