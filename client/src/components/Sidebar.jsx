// Sidebar Navigation (UI Spec Section 2 Navigation Map)
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  GitBranch,
  GitCommit,
  GitFork,
  Bug,
  BarChart3,
  Users
} from 'lucide-react';

export default function Sidebar() {
  const { userRole } = useProject();

  // Navigation map definitions per UI Spec Section 2
  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      testId: 'nav-dashboard',
      allowed: true
    },
    {
      label: 'Requirements',
      path: '/requirements',
      icon: FileText,
      testId: 'nav-requirements',
      allowed: true
    },
    {
      label: 'Test Cases',
      path: '/tests',
      icon: CheckSquare,
      testId: 'nav-tests',
      allowed: true
    },
    {
      label: 'Repository',
      path: '/repository',
      icon: GitBranch,
      testId: 'nav-repository',
      allowed: true
    },
    {
      label: 'Mappings',
      path: '/mappings',
      icon: GitFork,
      testId: 'nav-mappings',
      allowed: true
    },
    {
      label: 'Commits & Impact',
      path: '/commits',
      icon: GitCommit,
      testId: 'nav-commits',
      allowed: true
    },
    {
      label: 'Bugs',
      path: '/bugs',
      icon: Bug,
      testId: 'nav-bugs',
      allowed: true
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: BarChart3,
      testId: 'nav-reports',
      allowed: true
    },
    {
      label: 'Projects & Members',
      path: '/projects',
      icon: Users,
      testId: 'nav-projects',
      // Visible only to PM and TL
      allowed: userRole === 'PM' || userRole === 'TL'
    }
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems
          .filter((item) => item.allowed)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={item.testId}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>
    </aside>
  );
}
