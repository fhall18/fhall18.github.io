import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

const Cell = ({ data }) => {
  const hasInteractive = data.interactive || data.embed;
  const detailLink = `/projects/${data.slug}`;

  // Use interactive detail page as primary link if no external link exists
  const primaryLink = data.link || (hasInteractive ? detailLink : '#');
  const imageLink = hasInteractive && !data.link ? detailLink : data.link;

  return (
    <div className="cell-container">
      <article className="mini-post">
        <header>
          <h3>
            {hasInteractive && !data.link
              ? <Link to={detailLink}>{data.title}</Link>
              : <a href={primaryLink}>{data.title}</a>}
          </h3>
          <time className="published">{dayjs(data.date).format('MMMM, YYYY')}</time>
        </header>
        {hasInteractive && !data.link ? (
          <Link to={detailLink} className="image">
            <img src={`${process.env.PUBLIC_URL}${data.image}`} alt={data.title} />
          </Link>
        ) : (
          <a href={imageLink} className="image">
            <img src={`${process.env.PUBLIC_URL}${data.image}`} alt={data.title} />
          </a>
        )}
        <div className="description">
          <p>{data.desc}</p>
        </div>
      </article>
    </div>
  );
};

Cell.propTypes = {
  data: PropTypes.shape({
    title: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    link: PropTypes.string,
    image: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    desc: PropTypes.string.isRequired,
    interactive: PropTypes.string,
    embed: PropTypes.string,
  }).isRequired,
};

export default Cell;
