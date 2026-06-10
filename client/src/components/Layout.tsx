import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/schedule', label: 'Schedule' },
  { path: '/masses', label: 'Mass History' },
  { path: '/members', label: 'Members' },
  { path: '/community', label: 'Community' },
  { path: '/changelog', label: 'Change Log' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <>
      <header className="main-header">
        <div className="header-top">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="St. Mathias Church"
            className="church-logo"
          />
          <div className="header-titles">
            <h1 className="community-name">St. Mathias English Community</h1>
            <p className="app-name">Liturgia</p>
          </div>
        </div>
        <nav className="main-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={location.pathname === item.path ? 'active' : ''}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="main-content">{children}</main>
    </>
  );
}
