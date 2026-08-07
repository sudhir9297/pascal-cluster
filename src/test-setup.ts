/**
 * React DOM's static renderer does not know React Three Fiber's intrinsic
 * elements and props. A number of structural tests intentionally use it to
 * inspect generated markup, so suppress only those renderer-mismatch messages.
 * All other console errors continue to reach the test output.
 */
const reactThreeServerRendererMessages = new Set([
  'React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.',
  'Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.\n\nIf you used to conditionally omit it with %s={condition && value}, pass %s={condition ? value : undefined} instead.',
  '<%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.',
])

const reportConsoleError = console.error.bind(console)

console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string'
    && reactThreeServerRendererMessages.has(args[0])
  ) return
  if (
    args[0] === 'Invalid value for prop %s on <%s> tag. Either remove it from the element, or pass a string or number value to keep it in the DOM. For details, see https://react.dev/link/attribute-behavior '
    && args[1] === '`raycast`'
    && args[2] === 'mesh'
  ) return
  reportConsoleError(...args)
}

export {}
