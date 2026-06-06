const config = {
  moduleNameMapper: {
    '^.+\\.(css|less|scss)$': 'babel-jest',
    '^.+\\.md$': 'markdown-to-jsx',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!react-ga4)',
  ],
  transform: {
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },
};

module.exports = config;
