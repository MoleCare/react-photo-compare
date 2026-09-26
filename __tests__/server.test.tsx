/**
 * @jest-environment node
 */
import { renderToString } from 'react-dom/server';
import { PhotoCompare } from '../src';

// Next.js, Remix and Astro render on the server first, where there is no
// window, document or layout.
it('renders on the server without touching the DOM', () => {
  expect(typeof window).toBe('undefined');
  const html = renderToString(
    <PhotoCompare
      left={{ src: '/a.jpg', alt: 'First photo', label: 'March' }}
      right={{ alt: 'Second photo', placeholder: 'Choose a photo' }}
    />
  );
  expect(html).toContain('alt="First photo"');
  expect(html).toContain('Choose a photo');
  expect(html).toContain('translate(0px, 0px) scale(1)');
});
