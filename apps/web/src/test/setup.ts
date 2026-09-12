import '@testing-library/jest-dom/vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as never)

// jsdom 未实现带伪元素参数的 getComputedStyle(elt, pseudoElt)，而 rc-util 在测量滚动条时
// 会传 '::-webkit-scrollbar' 调用它，jsdom 直接抛 "Not implemented"，错误从 layout effect
// 抛出会打断 React 的提交、让交互测试卡死。这里把伪元素参数丢掉，只走 jsdom 已实现的那条路径。
const getComputedStyle = window.getComputedStyle.bind(window)

Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: (element: Element) => getComputedStyle(element),
})
