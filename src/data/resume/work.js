/**
 * @typedef {Object} Position
 * Conforms to https://jsonresume.org/schema/
 *
 * @property {string} name - Name of the company
 * @property {string} position - Position title
 * @property {string} url - Company website
 * @property {string} startDate - Start date of the position in YYYY-MM-DD format
 * @property {string|undefined} endDate - End date of the position in YYYY-MM-DD format.
 * If undefined, the position is still active.
 * @property {string|undefined} summary - html/markdown summary of the position
 * @property {string[]} highlights - plain text highlights of the position (bulleted list)
 */
const work = [
  // {
  //   name: 'EnergyHub',
  //   position: 'Data Science',
  //   url: 'https://www.energyhub.com',
  //   startDate: '2024-03-18',
  //   summary: ``,
  //   highlights: [
  //     'Optimization.',
  //     'Python based modeling.',
  //     'Data science.',
  //   ],
  // },
  {
    name: 'Burlington Electric',
    position: 'Resource Planner',
    url: 'https://burlingtonelectric.com',
    startDate: '2016-09-01',
    summary: `Burlington Electric is ambitiously working to transform the City of Burlington to become the 
    first Net Zero Energy city in the world. This task requires careful planning with innovative programs, 
    designed to generate community engagement while supporting equitable progress towards a cleaner energy system.
    My work consists of daily forecasting and bidding for load and intermittent renewables, lead market participant 
    in ISO-NE and other energy markets, development of programs and rates to guide deployment of distributed 
    energy resources, and additionally, performing statistical modeling and data analysis for business insight 
    that blend various data sources, including IoT devices, advanced metering infrastructure (AMI), SCADA, weather 
    and ISO-NE/wholesale market data.`,
    highlights: [
      'Wholesale Markets.',
      'Rate and Program Design.',
      'Python based Modeling.',
    ],
  },
  {
    name: 'Green Mountain Power',
    position: 'Product Innovation',
    url: 'http://greenmountainpower.com',
    startDate: '2015-09-01',
    endDate: '2016-09-01',
    summary: `Green Mountain Power (GMP) has a unique perspective on the role that a utility/energy services company 
    should play in the decades to come. With the rapid advancements of energy technologies, disruptive to the conventional 
    utility model, GMP welcomes this transition to a distributed energy grid by seeing value in these resources and 
    understanding the need for a zero carbon energy system.
    My work consisted of program design and implementation, project development, statistical analysis and visualization, 
    market research, and vendor negotiations. The topics of these projects included work with electric vehicles and 
    charging, battery storage, thermal storage, industrial storage, photovoltaics, and distributed energy management 
    system controls for grid side benefits. `,
    highlights: [
      'Identified opportunities with naiscent clean technologies.',
      'Operated the first distributed utility storage program in the country.',
    ],
  },
  {
    name: 'DeltaClimeVT',
    position: 'Mentor',
    url: 'https://deltaclimevt.com/',
    startDate: '2017-10-01',
    highlights: [
      'Provided mentorship to early stage startups focused on renewable energy and distributed energy resources.',
      'Advanced pilot programs with selected companies',
      'Companies I\'ve worked with: Packetized Energy, EVmatch, ARC Industries',
    ],
  },
  {
    name: 'Joint Lab',
    position: 'Researcher',
    url: 'https://joint-lab.github.io/',
    startDate: '2022-07-01',
    endDate: '2023-08-01',
    summary: `Collaborative explorations across sciences with models and data hosted at the Vermont Complex Systems
    Center. The research focuses on the coevolution of structure and dynamics in complex systems. We make sense of 
    complex data by bridging the gap between statistics, computer science and complex systems.`,
    highlights: [
      'Researched transportation dynamics.',
      'Performed agriculture and land use modeling for the State of Vermont Carbon Budget under the Global Warming Solution Act.',
    ],
  },
];

export default work;
