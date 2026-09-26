import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { PhotoCompare, useSyncedView, type View } from '../src';

// jsdom has no PointerEvent, so events would lose their pointerId.
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

// jsdom has no layout: every panel is 200 x 100 at the page's top left.
beforeAll(() => {
  Object.assign(window, { PointerEvent: TestPointerEvent });
  jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 100,
    width: 200,
    height: 100,
    toJSON: () => ({}),
  });
});

const photos = {
  left: { src: 'data:image/png;base64,AAAA', alt: 'Photo from 1 March', label: '1 March' },
  right: { src: 'data:image/png;base64,BBBB', alt: 'Photo from 1 June', label: '1 June' },
};

const images = () => screen.getAllByRole<HTMLImageElement>('img');
const panels = () => screen.getAllByRole('group');
const transforms = () => images().map((img) => img.style.transform);

describe('PhotoCompare', () => {
  it('shows both photos with labels and alt text', () => {
    render(<PhotoCompare {...photos} />);
    expect(images().map((img) => img.alt)).toEqual(['Photo from 1 March', 'Photo from 1 June']);
    expect(panels().map((p) => p.getAttribute('aria-label'))).toEqual(['1 March', '1 June']);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('zooms both photos together from the buttons', () => {
    render(<PhotoCompare {...photos} />);
    const zoomOut = screen.getByRole<HTMLButtonElement>('button', { name: 'Zoom out' });
    const reset = screen.getByRole<HTMLButtonElement>('button', { name: 'Reset zoom' });
    expect(zoomOut.disabled).toBe(true);
    expect(reset.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(transforms()).toEqual([
      'translate(0px, 0px) scale(1.25)',
      'translate(0px, 0px) scale(1.25)',
    ]);
    expect(screen.getByText('125%')).toBeTruthy();
    expect(zoomOut.disabled).toBe(false);
    expect(reset.disabled).toBe(false);

    fireEvent.click(zoomOut);
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(1)');
  });

  it('disables zoom in at the largest zoom', () => {
    render(<PhotoCompare {...photos} maxZoom={1.25} />);
    const zoomIn = screen.getByRole<HTMLButtonElement>('button', { name: 'Zoom in' });
    fireEvent.click(zoomIn);
    expect(zoomIn.disabled).toBe(true);
  });

  it('pans both photos when one is dragged, and only while a pointer is down', () => {
    render(<PhotoCompare {...photos} defaultView={{ zoom: 2, x: 0, y: 0 }} />);
    const [left, right] = panels();
    fireEvent.pointerMove(left!, { pointerId: 1, clientX: 150, clientY: 50 });
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(2)');

    fireEvent.pointerDown(left!, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(left!, { pointerId: 1, clientX: 130, clientY: 40 });
    expect(transforms()).toEqual([
      'translate(30px, -10px) scale(2)',
      'translate(30px, -10px) scale(2)',
    ]);

    fireEvent.pointerUp(left!, { pointerId: 1 });
    fireEvent.pointerMove(left!, { pointerId: 1, clientX: 180, clientY: 40 });
    expect(transforms()[1]).toBe('translate(30px, -10px) scale(2)');

    // A drag on the other panel moves both too.
    fireEvent.pointerDown(right!, { pointerId: 2, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(right!, { pointerId: 2, clientX: 90, clientY: 50 });
    fireEvent.pointerCancel(right!, { pointerId: 2 });
    expect(transforms()[0]).toBe('translate(20px, -10px) scale(2)');
  });

  it('captures and releases the pointer where the browser supports it', () => {
    render(<PhotoCompare {...photos} />);
    const panel = panels()[0]!;
    const setPointerCapture = jest.fn();
    const releasePointerCapture = jest.fn();
    Object.assign(panel, { setPointerCapture, releasePointerCapture });
    fireEvent.pointerDown(panel, { pointerId: 7, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(panel, { pointerId: 7 });
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('pinch zooms around the fingers', () => {
    render(<PhotoCompare {...photos} />);
    const panel = panels()[0]!;
    // Two fingers 40 px apart around the centre (100, 50) spread to 80 px.
    fireEvent.pointerDown(panel, { pointerId: 1, clientX: 80, clientY: 50 });
    fireEvent.pointerDown(panel, { pointerId: 2, clientX: 120, clientY: 50 });
    fireEvent.pointerMove(panel, { pointerId: 2, clientX: 160, clientY: 50 });
    // Distance 40 -> 80 doubles the zoom: first 1 -> 2 around the midpoint
    // (20, 0), then the midpoint moved from 0 to 20.
    expect(transforms()[0]).toBe('translate(20px, 0px) scale(2)');

    // Lifting one finger turns the other back into a drag.
    fireEvent.pointerUp(panel, { pointerId: 2 });
    fireEvent.pointerMove(panel, { pointerId: 1, clientX: 70, clientY: 50 });
    expect(transforms()[0]).toBe('translate(10px, 0px) scale(2)');
  });

  it('ignores a pinch that starts with both fingers on one spot', () => {
    render(<PhotoCompare {...photos} />);
    const panel = panels()[0]!;
    fireEvent.pointerDown(panel, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerDown(panel, { pointerId: 2, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(panel, { pointerId: 2, clientX: 140, clientY: 50 });
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(1)');
  });

  it('zooms with the wheel and only then stops the page scrolling', () => {
    render(<PhotoCompare {...photos} />);
    const panel = panels()[0]!;

    const zoomIn = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: 100,
      clientY: 50,
      cancelable: true,
    });
    act(() => {
      panel.dispatchEvent(zoomIn);
    });
    expect(zoomIn.defaultPrevented).toBe(true);
    expect(transforms()[1]).toBe('translate(0px, 0px) scale(1.15)');

    const sideways = new WheelEvent('wheel', { deltaY: 0, deltaX: 30, cancelable: true });
    act(() => {
      panel.dispatchEvent(sideways);
    });
    expect(sideways.defaultPrevented).toBe(false);

    act(() => {
      panel.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 100, clientX: 100, clientY: 50, cancelable: true })
      );
    });
    // At the smallest zoom the wheel scrolls the page again.
    const atLimit = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
    act(() => {
      panel.dispatchEvent(atLimit);
    });
    expect(atLimit.defaultPrevented).toBe(false);
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(1)');
  });

  it('works from the keyboard', () => {
    render(<PhotoCompare {...photos} />);
    const panel = panels()[0]!;
    expect(panel.tabIndex).toBe(0);

    fireEvent.keyDown(panel, { key: '+' });
    fireEvent.keyDown(panel, { key: '=' });
    fireEvent.keyDown(panel, { key: '+' });
    fireEvent.keyDown(panel, { key: '+' });
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(2)');

    // Arrows move the view that way, so the photo moves the other way by 10%.
    fireEvent.keyDown(panel, { key: 'ArrowRight' });
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
    expect(transforms()[0]).toBe('translate(-20px, -10px) scale(2)');
    fireEvent.keyDown(panel, { key: 'ArrowLeft' });
    fireEvent.keyDown(panel, { key: 'ArrowUp' });
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(2)');

    fireEvent.keyDown(panel, { key: '-' });
    fireEvent.keyDown(panel, { key: '_' });
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(1.5)');

    fireEvent.keyDown(panel, { key: '0' });
    expect(transforms()[1]).toBe('translate(0px, 0px) scale(1)');
  });

  it('leaves other keys, and keys that change nothing, to the page', () => {
    render(<PhotoCompare {...photos} />);
    const panel = panels()[0]!;
    expect(fireEvent.keyDown(panel, { key: 'a' })).toBe(true);
    // At zoom 1 an arrow cannot move the photo, so the page may scroll.
    expect(fireEvent.keyDown(panel, { key: 'ArrowDown' })).toBe(true);
    expect(fireEvent.keyDown(panel, { key: '+' })).toBe(false);
  });

  it('shows placeholders, and names panels whose label is not text', () => {
    render(
      <PhotoCompare
        left={{ alt: 'First photo', placeholder: 'Choose a photo', label: <b>March</b> }}
        right={{ src: null, alt: 'Second photo' }}
        labels={{ panel: (side) => `${side} side` }}
      />
    );
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByText('Choose a photo')).toBeTruthy();
    expect(panels().map((p) => p.getAttribute('aria-label'))).toEqual(['left side', 'right side']);
  });

  it('uses the default English panel names', () => {
    render(<PhotoCompare left={{ alt: 'a' }} right={{ alt: 'b' }} />);
    expect(panels().map((p) => p.getAttribute('aria-label'))).toEqual([
      'Left photo',
      'Right photo',
    ]);
  });

  it('takes translated labels, a class name, style and panel shape', () => {
    const { container } = render(
      <PhotoCompare
        {...photos}
        className="mine"
        style={{ maxWidth: 600 }}
        aspectRatio="4 / 3"
        objectFit="cover"
        labels={{ zoomIn: 'Vergrößern', zoomLevel: (p) => `${String(p)} %` }}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe('mpc mine');
    expect(root.style.maxWidth).toBe('600px');
    expect(panels()[0]!.style.aspectRatio).toBe('4 / 3');
    expect(images()[0]!.style.objectFit).toBe('cover');
    expect(screen.getByRole('button', { name: 'Vergrößern' })).toBeTruthy();
    expect(screen.getByText('100 %')).toBeTruthy();
  });

  it('can hide the controls', () => {
    render(<PhotoCompare {...photos} hideControls />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('can be controlled', () => {
    const changes: View[] = [];
    function Controlled() {
      const [view, setView] = useState<View>({ zoom: 2, x: 0, y: 0 });
      return (
        <>
          <PhotoCompare
            {...photos}
            view={view}
            onViewChange={(next) => {
              changes.push(next);
              setView(next);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setView({ zoom: 3, x: 0, y: 0 });
            }}
          >
            outside
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(2)');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(changes).toEqual([{ zoom: 2.25, x: 0, y: 0 }]);
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(2.25)');
    fireEvent.click(screen.getByRole('button', { name: 'outside' }));
    expect(transforms()[1]).toBe('translate(0px, 0px) scale(3)');
  });

  it('does not move when the parent ignores a controlled change', () => {
    const onViewChange = jest.fn();
    render(<PhotoCompare {...photos} view={{ zoom: 1, x: 0, y: 0 }} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onViewChange).toHaveBeenCalledWith({ zoom: 1.25, x: 0, y: 0 });
    expect(transforms()[0]).toBe('translate(0px, 0px) scale(1)');
  });

  it('rejects impossible limits', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<PhotoCompare {...photos} minZoom={2} maxZoom={1} />)).toThrow(
      /maxZoom must be at least minZoom/
    );
  });
});

describe('useSyncedView', () => {
  function Three({ onReady }: { onReady: (s: ReturnType<typeof useSyncedView>) => void }) {
    const synced = useSyncedView({ step: 1 });
    onReady(synced);
    return (
      <>
        {['a', 'b', 'c'].map((key) => (
          <div key={key} role="group" {...synced.getPanelProps(key)} />
        ))}
      </>
    );
  }

  it('shares one view between any number of panels, and sets views from outside', () => {
    let synced!: ReturnType<typeof useSyncedView>;
    const { unmount } = render(<Three onReady={(s) => (synced = s)} />);
    act(() => {
      synced.setView({ zoom: 99, x: 1e6, y: -1e6 });
    });
    // Clamped to the largest zoom and to a 200 x 100 panel.
    expect(synced.view).toEqual({ zoom: 5, x: 400, y: -200 });
    expect(synced.canZoomIn).toBe(false);

    fireEvent.keyDown(panels()[2]!, { key: '0' });
    expect(synced.view).toEqual({ zoom: 1, x: 0, y: 0 });
    act(() => {
      synced.zoomIn();
    });
    expect(synced.view.zoom).toBe(2);
    act(() => {
      synced.reset();
    });
    expect(synced.view.zoom).toBe(1);
    unmount();
  });

  it('works before any panel is mounted', () => {
    let synced!: ReturnType<typeof useSyncedView>;
    function NoPanels() {
      synced = useSyncedView();
      return null;
    }
    render(<NoPanels />);
    act(() => {
      synced.zoomIn();
    });
    // No panel means no room to pan, but the zoom still changes.
    expect(synced.view).toEqual({ zoom: 1.25, x: 0, y: 0 });
  });

  it('moves the wheel listener when a panel element is replaced', () => {
    let synced!: ReturnType<typeof useSyncedView>;
    function Swap({ which }: { which: 'one' | 'two' }) {
      synced = useSyncedView();
      const props = synced.getPanelProps('only');
      return which === 'one' ? <section {...props} /> : <article {...props} />;
    }
    const { container, rerender } = render(<Swap which="one" />);
    const first = container.firstElementChild as HTMLElement;
    rerender(<Swap which="two" />);
    act(() => {
      first.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, cancelable: true }));
    });
    expect(synced.view.zoom).toBe(1);
    act(() => {
      container.firstElementChild!.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -1, cancelable: true })
      );
    });
    expect(synced.view.zoom).toBe(1.15);
  });
});
