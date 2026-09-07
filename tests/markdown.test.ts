import { expect, test } from 'vitest';
import { generateMarkdownOutline, parseMarkdownOutline } from '../lib/adapters/markdown';

test('Markdown Outline Adapter: serialization of tree to indented markdown', () => {
  const nodes = [
    { id: '1', data: { label: 'Root Engineering', status: 'in_progress', tags: ['lead'] } },
    { id: '2', data: { label: 'Frontend', status: 'completed', description: 'Web UI' } },
    { id: '3', data: { label: 'React.js', status: 'completed' } },
    { id: '4', data: { label: 'Backend', status: 'planned', tags: ['api'] } },
  ];

  const edges = [
    { source: '1', target: '2' },
    { source: '2', target: '3' },
    { source: '1', target: '4' },
  ];

  const md = generateMarkdownOutline(nodes, edges);
  expect(md).toContain('# Root Engineering');
  expect(md).toContain('- [x] Frontend (Web UI)');
  expect(md).toContain('  - [x] React.js');
  expect(md).toContain('- [ ] Backend #api');
});

test('Markdown Outline Adapter: parsing indented markdown back to hierarchy', () => {
  const input = `# Cybersecurity Mastery
- [x] Network Security (Packet analysis) #core
  - [ ] Wireshark
  - [x] Nmap
- [-] Web Exploitation #security
  - [ ] SQL Injection
`;

  const parsed = parseMarkdownOutline(input);
  expect(parsed.nodes.length).toBe(6);
  expect(parsed.nodes[0].label).toBe('Cybersecurity Mastery');
  expect(parsed.nodes[1].label).toBe('Network Security');
  expect(parsed.nodes[1].description).toBe('Packet analysis');
  expect(parsed.nodes[1].tags).toContain('core');
  expect(parsed.nodes[1].status).toBe('completed');
  expect(parsed.nodes[4].status).toBe('in_progress');

  // Check edge connections
  expect(parsed.edges.length).toBe(5);
  // Root -> Network Security
  expect(parsed.edges[0].source).toBe(parsed.nodes[0].id);
  expect(parsed.edges[0].target).toBe(parsed.nodes[1].id);
  // Network Security -> Wireshark
  expect(parsed.edges[1].source).toBe(parsed.nodes[1].id);
  expect(parsed.edges[1].target).toBe(parsed.nodes[2].id);
});
