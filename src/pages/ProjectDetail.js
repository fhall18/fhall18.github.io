import React, { Suspense, lazy } from 'react';
import { useParams, Navigate } from 'react-router-dom';

import Main from '../layouts/Main';
import data from '../data/projects';

// Map of interactive component names to their lazy-loaded modules
const interactiveComponents = {
  MilesPerDollarViz: lazy(() => import('../components/Projects/Interactive/MilesPerDollarViz')),
  HabForecastViz: lazy(() => import('../components/Projects/Interactive/HabForecastViz')),
};

const ProjectDetail = () => {
  const { slug } = useParams();
  const project = data.find((p) => p.slug === slug);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  const InteractiveComponent = project.interactive
    ? interactiveComponents[project.interactive]
    : null;

  return (
    <Main
      title={project.title}
      description={project.desc}
    >
      <article className="post" id="project-detail">
        <header>
          <div className="title">
            <h2>{project.title}</h2>
            <p>{project.subtitle}</p>
          </div>
        </header>
        <div className="project-detail-content">
          <p>{project.desc}</p>
          {project.link && (
            <p><a href={project.link} target="_blank" rel="noopener noreferrer">View original project &rarr;</a></p>
          )}
        </div>
        <div className="interactive-container">
          {InteractiveComponent && (
            <Suspense fallback={<div className="loading">Loading visualization...</div>}>
              <InteractiveComponent />
            </Suspense>
          )}
          {project.embed && (
            <div className="embed-container">
              <iframe
                src={project.embed}
                title={`${project.title} interactive`}
                width="100%"
                height="600"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>
      </article>
    </Main>
  );
};

export default ProjectDetail;
