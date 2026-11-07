export default function RoleWelcomePage({ role }) {
  return (
    <section className="role-welcome">
      <span className="eyebrow">The Mentorship Academy</span>
      <h1>{role} workspace</h1>
      <p>
        This is the foundation for the {role.toLowerCase()} experience. Platform
        features will be added in a later development phase.
      </p>
      <span className="coming-soon">Foundation ready</span>
    </section>
  );
}
