// Custom reference volumes, rather than replicas of published book jackets.
// The ten editable skill books contain placeholder content.
import { BOOKS } from './books.js';

const palette = ['#384f50', '#9d533d', '#dfd1b5', '#34483a', '#743b46', '#263e56', '#b28b45', '#525056', '#e6dfce', '#477b79', '#69506e', '#985e38'];
let volume = 0;
function edition(info, collection) {
  const number = ++volume;
  return { ...info, collection, volume: number, jacket: (number - 1) % 4 };
}
function references(collection, source) {
  return source.trim().split('\n').map((line) => {
    const [title, subtitle, chapters] = line.trim().split('|');
    return edition({
      title, subtitle, color: palette[(volume * 7) % palette.length], reference: true,
      intro: `A compact reference to ${subtitle.charAt(0).toLowerCase() + subtitle.slice(1)}.`,
      points: chapters.split(' · '), usedIn: `${collection} · Your reference library`,
    }, collection);
  });
}

// Bottom shelf to top shelf. Every standing and stacked volume is unique.
export const SHELF_COLLECTIONS = [
  references('Ideas & practice', `
Problem Solving|Breaking difficult problems into useful steps|Decomposition · Constraints · Iterative solutions
The Craft of Code|Clarity, care and readable software|Naming · Small functions · Useful abstractions
Practical Computing|The foundations behind everyday software|Bits and bytes · Memory · Programs
Software Design|Making software easier to understand and change|Boundaries · Cohesion · Tradeoffs
Logic & Reasoning|Thinking precisely about problems|Arguments · Conditions · Proofs
Mathematics|Patterns, quantities and structures|Algebra · Probability · Discrete mathematics
Patterns in Nature|Finding structure in the world around us|Symmetry · Repetition · Emergence
The Learning Habit|Building understanding through practice|Curiosity · Active recall · Reflection
Creative Thinking|Exploring possibilities and making connections|Observation · Divergent ideas · Experimentation
Focus & Flow|Making space for thoughtful work|Attention · Routines · Rest
Building Ideas|Turning a small concept into something useful|Sketches · Prototypes · Feedback
Daily Practice|Small steps toward consistent progress|Rituals · Deliberate practice · Review
Working Notes|Keeping a useful record of decisions|Observations · Decisions · Next steps
The Maker’s Mind|Learning by making and experimenting|Materials · Prototypes · Iteration
Better Questions|Framing problems with curiosity|Context · Assumptions · Open questions
Small Experiments|Testing ideas with a manageable scope|Hypotheses · Evidence · Reflection
Engineering Journal|Recording the thinking behind a build|Requirements · Sketches · Decisions
Beyond the Screen|Finding inspiration away from the desk|Observation · Play · Perspective
`),
  references('Engineering systems', `
Git & Collaboration|Keeping changes understandable and reviewable|Commits · Branches · Reviews
Linux Essentials|Working with a Unix command line|Files · Processes · Permissions
Cloud Foundations|The building blocks of hosted applications|Compute · Storage · Networking
Containers|Packaging applications with their dependencies|Images · Containers · Compose
Deployment Notes|Moving a build into a running environment|Configuration · Releases · Rollbacks
Observability|Understanding the behavior of running systems|Logs · Metrics · Traces
Performance|Finding and improving real bottlenecks|Measurement · Profiling · Latency
Caching|Reusing work with clear consistency rules|Cache keys · Invalidation · Expiry
Message Queues|Communicating through asynchronous messages|Producers · Consumers · Delivery
Distributed Systems|Coordinating work across multiple services|Replication · Consistency · Failures
Resilient APIs|Designing for partial failures|Timeouts · Retries · Circuit breakers
Secure by Design|Thinking about security from the beginning|Trust boundaries · Least privilege · Validation
Code Reviews|Sharing context and improving a change|Intent · Correctness · Maintainability
Team Playbook|Making collaboration clear and sustainable|Shared goals · Communication · Retrospectives
Release Engineering|Delivering changes in small, repeatable steps|Versioning · Build pipelines · Release checks
`),
  references('Design & the web', `
TypeScript|Types, interfaces and safer JavaScript|Type models · Narrowing · Generics
Modern JavaScript|The language of the browser|Functions · Modules · Async code
React|Composing interfaces from components|Components · State · Effects
Web Foundations|The structures behind a web page|HTML · CSS · JavaScript
CSS Layouts|Arranging content across different screens|Flexbox · Grid · Responsive layouts
WebGL|Rendering graphics in a browser|Geometry · Shaders · Textures
Three.js|Building interactive scenes on the web|Scenes · Cameras · Materials
Creative Coding|Expressing ideas through small programs|Patterns · Generative forms · Interaction
Interface Design|Making useful and understandable screens|Hierarchy · Affordances · Feedback
Motion Design|Using time and movement with intention|Timing · Easing · Continuity
Accessibility|Making interfaces work for more people|Keyboard access · Contrast · Semantics
Design Systems|Sharing a consistent visual language|Tokens · Components · Patterns
Color & Type|Creating visual rhythm and hierarchy|Palettes · Typography · Contrast
Interaction Design|Connecting user actions to clear responses|Flows · States · Feedback
The Web Platform|Understanding the browser as an environment|DOM · Events · Browser APIs
Browser Graphics|Balancing visual detail and rendering cost|Rasterization · Compositing · Frame budgets
Responsive Design|Adapting layouts to available space|Breakpoints · Flexible content · Touch
Design Details|Refining the small things that make a whole|Spacing · Alignment · Finish
`),
  [
    ...BOOKS.slice(0, 5).map(info => edition(info, 'Backend engineering')),
    ...references('Backend engineering', `
API Design|Defining clear boundaries between systems|Resources · Contracts · Versioning
Clean Architecture|Separating policies from implementation details|Layers · Dependencies · Boundaries
Design Patterns|Recognizing recurring software structures|Creation · Composition · Behavior
Concurrency|Managing work that overlaps in time|Threads · Synchronization · Shared state
JVM Internals|The runtime behind a Java application|Bytecode · Memory · Garbage collection
HTTP & Networking|How requests travel between systems|Methods · Status codes · Connections
SQL Essentials|Asking precise questions of relational data|Queries · Joins · Aggregates
Database Design|Structuring data around useful constraints|Entities · Relationships · Indexes
Event Driven Systems|Organizing behavior around meaningful events|Events · Handlers · Ordering
Testing Strategies|Choosing checks that reveal useful failures|Unit tests · Integration tests · System tests
Reliable Services|Keeping services understandable under pressure|Health checks · Failure handling · Recovery
System Design|Connecting components into a coherent whole|Requirements · Architecture · Tradeoffs
`),
  ],
  [
    ...BOOKS.slice(5).map(info => edition(info, 'AI & data')),
    ...references('AI & data', `
Vector Search|Finding related content using numerical representations|Vectors · Similarity · Nearest neighbors
Embeddings|Representing meaning in a vector space|Representations · Distance · Retrieval
Language Models|Working with models that generate text|Tokens · Context · Generation
Data Pipelines|Moving data through clear processing stages|Ingestion · Transformation · Validation
Model Evaluation|Checking the behavior of an AI system|Datasets · Metrics · Error analysis
Computer Vision|Extracting useful structure from images|Features · Detection · Image processing
Data Structures|Organizing information for useful operations|Lists · Trees · Hash maps
Algorithms|Comparing approaches to solving a problem|Search · Sorting · Complexity
Machine Learning|Learning patterns from examples|Features · Training · Validation
Prompt Design|Giving a language model useful context|Instructions · Examples · Output structure
AI Ethics|Considering the effects of automated systems|Fairness · Privacy · Accountability
`),
  ],
];

export const SHELF_STACK = references('Studio notes', `
Build Journal|Keeping a record of experiments and prototypes|Ideas · Experiments · Observations
Sketchbook|Thinking through an idea with simple drawings|Shapes · Layouts · Studies
Release Notes|Recording what changed and why|Changes · Improvements · Follow-ups
`);

export const SIDEBOARD_BOOKS = references('Studio collection', `
Architecture Atlas|Exploring the shapes of software systems|Structures · Connections · Boundaries
The Creative Process|Moving between exploration and refinement|Research · Ideation · Making
Objects & Spaces|Looking at how everyday things fit together|Materials · Proportion · Light
A Quiet Workspace|Making room for focused, thoughtful work|Space · Rhythm · Everyday details
`);

export const FLOATING_SHELF_BOOKS = references('Visual studies', `
Field Studies|Looking closely at everyday details|Observation · Notes · Small discoveries
Material Notes|Exploring surface, texture and finish|Wood · Paper · Cloth
A Way of Seeing|Finding a fresh perspective on familiar things|Composition · Light · Color
`);
