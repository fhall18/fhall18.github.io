import React from 'react';
import { Link } from 'react-router-dom';

import ContactIcons from '../Contact/ContactIcons';

const { PUBLIC_URL } = process.env; // set automatically from package.json:homepage

const SideBar = () => (
  <section id="sidebar">
    <section id="intro">
      <Link to="/" className="logo">
        <img src={`${PUBLIC_URL}/images/me.jpg`} alt="" />
      </Link>
      <header>
        <h2>Frederick Hall</h2>
        <p><a href="mailto:frederickchall@gmail.com">frederickchall@gmail.com</a></p>
      </header>
    </section>

    <section className="blurb">
      <h2>About</h2>
      <p>Hi, I&apos;m Frederick. I am a <a href="https://vermontcomplexsystems.org/">Vermont Complex Systems</a> graduate,
        and Resource Planner at <a href="https://burlingtonelectric.com">Burlington Electric</a>.
        I focus on decarbonizing the energy system through electrification and renewable energy.
        Previously, I worked for <a href="https://greenmountainpower.com/">Green Mountain Power</a> focusing on product innovation.
        When the snow falls, I Ski Patrol at <a href="https://www.madriverglen.com/ski-patrol/">Mad River Glen </a>.
      </p>
      <ul className="actions">
        <li>
          {!window.location.pathname.includes('/resume') ? <Link to="/resume" className="button">Learn More</Link> : <Link to="/about" className="button">About Me</Link>}
        </li>
      </ul>
    </section>

    <section id="footer">
      <ContactIcons />
      <p className="copyright">&copy; Frederick Hall <Link to="/">mldangelo.com</Link>.</p>
    </section>
  </section>
);

export default SideBar;
