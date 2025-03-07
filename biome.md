Here are the lint rules from Biome organized into markdown tables by category:

## Accessibility

| Rule | Description |
|------|-------------|
| noAriaUnsupportedElements | Disallow `aria-*` properties on HTML elements that do not support them |
| noAutofocus | Disallow the `autoFocus` attribute on elements |
| noBlankTarget | Disallow `target="_blank"` attribute without `rel="noreferrer"` |
| noDistractingElements | Disallow distracting elements |
| noHeaderScope | Disallow `scope` attribute except on `<th>` elements |
| noInteractiveElementToNoninteractiveRole | Disallow assigning non-interactive roles to interactive elements |
| noNoninteractiveElementToInteractiveRole | Disallow assigning interactive roles to non-interactive elements |
| noNoninteractiveTabindex | Disallow `tabIndex` on non-interactive elements |
| noPositiveTabindex | Disallow positive `tabIndex` property values |
| noRedundantAlt | Disallow redundant alternative text on `<img>` elements |
| noSvgWithoutTitle | Enforce that SVG elements have a `<title>` |
| useAltText | Enforce `alt` attribute for the `img`, `area`, `input[type="image"]`, and `object` elements |
| useAriaPropsForRole | Enforce that elements with ARIA roles must have all required ARIA attributes |
| useHeadingContent | Enforce heading elements (`h1`, `h2`, etc.) to have content |
| useHtmlLang | Enforce `lang` attribute on the `<html>` element |
| useKeyWithClickEvents | Enforce `onClick` is accompanied by at least one of the following: `onKeyUp`, `onKeyDown
`, `onKeyPress` |                                                                                                 | useKeyWithMouseEvents | Enforce that `onMouseOver`/`onMouseOut` are accompanied by `onFocus`/`onBlur` |
| useMediaCaption | Enforce that `<audio>` and `<video>` elements must have a `<track>` for captions |
| useValidAnchor | Enforce all anchors are valid, navigable elements |
| useValidAriaProps | Enforce that ARIA properties are valid |
| useValidAriaValues | Enforce that ARIA state and property values are valid |
| useValidLang | Enforce `lang` attribute values are valid |

## Complexity

| Rule | Description |
|------|-------------|
| noExcessiveCognitiveComplexity | Disallow code with excessive cognitive complexity |
| noExcessiveComplexity | Disallow code with excessive complexity |
| noExcessiveNestedTestSuites | Disallow excessive nesting of test suites |
| noForEach | Disallow Array.prototype.forEach |
| noStaticOnlyClass | Disallow classes with only static members |
| noThisInStatic | Disallow `this` and `super` in `static` contexts |
| noUselessCatch | Disallow unnecessary `catch` clauses |
| noUselessConstructor | Disallow unnecessary constructors |
| noUselessEmptyExport | Disallow empty exports that don't change anything in a module file |
| noUselessFragments | Disallow unnecessary fragments |
| noUselessLabel | Disallow unnecessary labels |
| noUselessLoneBlockStatements | Disallow unnecessary nested block statements |
| noUselessRename | Disallow renaming import, export, and destructured assignments to the same name |
| noUselessSwitchCase | Disallow useless `case` in `switch` statements |
| noUselessTernary | Disallow ternary operators when simpler alternatives exist |
| noUselessThisAlias | Disallow useless `this` aliasing |
| noUselessTypeConstraint | Disallow using `any` or `unknown` as type constraint |
| noUselessUndefinedInitialization | Disallow initializing variables to `undefined` |
| noVoid | Disallow the use of `void` operators |
| noWith | Disallow `with` statements in non-strict contexts |
| useArrowFunction | Use arrow functions over function expressions |
| useFlatMap | Promotes the use of `.flatMap()` when `map().flat()` are used together |
| useLiteralKeys | Enforce the usage of a literal access to properties over computed property access |
| useOptionalChain | Enforce using concise optional chain instead of chained logical expressions |
| useRegexLiterals | Enforce the use of regular expression literals instead of the RegExp constructor if possible 
|                                                                                                                 | useSimpleNumberKeys | Disallow number literal object member names which are not base10 or use underscore as sepa
rator |                                                                                                           | useSimplifiedLogicExpression | Discard redundant terms from logical expressions |

## Correctness

| Rule | Description |
|------|-------------|
| noChildrenProp | Prevent passing of children as props |
| noConstAssign | Prevents `const` variables from being re-assigned |
| noConstantCondition | Disallow constant expressions in conditions |
| noConstructorReturn | Disallow returning a value from a `constructor` |
| noEmptyCharacterClassInRegex | Disallow empty character classes in regular expression literals |
| noEmptyPattern | Disallow empty destructuring patterns |
| noGlobalObjectCalls | Disallow calling global object properties as functions |
| noInvalidConstructorSuper | Disallow invalid uses of `super()` in constructors |
| noInvalidNewBuiltin | Disallow invalid uses of `new` with built-in globals |
| noMisleadingInstantiator | Disallow misleading class instantiation |
| noPrecisionLoss | Disallow literal numbers that lose precision |
| noRenderReturnValue | Disallow returning a value from `render` |
| noSelfAssign | Disallow assignments where both sides are exactly the same |
| noSetterReturn | Disallow returning values from setters |
| noStringCaseMismatch | Disallow string literal with inconsistent casing when compared |
| noSwitchDeclarations | Disallow lexical declarations in `switch` clauses |
| noUndeclaredVariables | Disallow the use of undeclared variables |
| noUnnecessaryContinue | Disallow unnecessary `continue` statements |
| noUnreachable | Disallow unreachable code |
| noUnreachableSuper | Disallow `super()` call in constructor if it's guaranteed to be unreachable |
| noUnsafeFinally | Disallow control flow statements in `finally` blocks |
| noUnusedLabels | Disallow unused labels |
| noUnusedVariables | Disallow unused variables |
| noVoidElementsWithChildren | Disallow void elements (e.g. `<img />`, `<br />`) with `children` |
| useExhaustiveDependencies | Enforce all dependencies are correctly specified |
| useHookAtTopLevel | Enforce React hooks to be called at the top level |
| useIsNan | Require calls to `isNaN()` when checking for `NaN` |
| useValidForDirection | Enforce `for` loop update clause moving the counter in the right direction |
| useYield | Require generator functions to contain `yield` |

## Performance

| Rule | Description |
|------|-------------|
| noAccumulatingSpread | Disallow the use of the spread `...` syntax on accumulators |
| noDelete | Disallow the use of the `delete` operator |
| noForEach | Disallow `Array.prototype.forEach` |
| noGlobalEval | Disallow the use of `eval()`-like methods |

## Security

| Rule | Description |
|------|-------------|
| noDangerouslySetInnerHtml | Disallow the use of `dangerouslySetInnerHTML` |
| noDangerouslySetInnerHtmlWithChildren | Disallow when an element uses both `children` and `dangerouslySetInnerHT
ML` |                                                                                                             
## Style

| Rule | Description |
|------|-------------|
| noArguments | Disallow the use of `arguments` |
| noCommaOperator | Disallow comma operator |
| noImplicitBoolean | Disallow implicit boolean expressions |
| noInferrableTypes | Disallow type annotations for variables, parameters, and object properties where the type ca
n be easily inferred from its value |                                                                             | noNamespaceImport | Disallow namespace import |
| noNegationElse | Disallow negation in the condition of an if-else statement if it has an else clause |
| noNonNullAssertion | Disallow non-null assertions using the `!` postfix operator |
| noParameterAssign | Disallow reassigning `function` parameters |
| noParameterProperties | Disallow the use of parameter properties in class constructors |
| noRestrictedGlobals | Disallow specific global variables |
| noShoutyConstants | Disallow the use of constants which its value is the upper-cased version of its name |
| noUnusedTemplateLiteral | Disallow template literals if placeholders are not used |
| noVar | Disallow `var` declarations |
| useBlockStatements | Require the use of block statements |
| useConst | Require `const` declarations for variables that are never reassigned after declared |
| useDefaultParameterLast | Enforce default parameters to be last |
| useEnumInitializers | Require that each enum member value be explicitly initialized |
| useExponentiationOperator | Disallow the use of `Math.pow` in favor of the `**` operator |
| useFragmentSyntax | Enforce using fragment syntax instead of `<Fragment>` |
| useLiteralEnumMembers | Require all enum members to be literal values |
| useNamingConvention | Enforce naming conventions for everything across a codebase |
| useNumericLiterals | Disallow `parseInt()` and `Number.parseInt()` in favor of binary, octal, and hexadecimal literals |                                                                                                          | useShorthandArrayType | Enforce using shorthand array syntax for simple array literals |
| useSingleCaseStatement | Enforce `switch` statements to have a `case` or `default` clause |
| useSingleVarDeclarator | Disallow multiple variable declarations in the same declaration statement |
| useTemplate | Enforce using template literals instead of string concatenation |
| useWhile | Disallow `for` loops with test conditions that do not modify the counting variable |

## Suspicious

| Rule | Description |
|------|-------------|
| noArrayIndexKey | Discourage the usage of Array index in keys |
| noAssignInExpressions | Disallow assignments in expressions |
| noAsyncPromiseExecutor | Disallow using an async function as a Promise executor |
| noClassAssign | Disallow reassigning class members |
| noConfusingLabels | Disallow labeled statements that are not loops |
| noConsoleLog | Disallow the use of `console.log` |
| noControlCharactersInRegex | Disallow control characters in regular expressions |
| noDebugger | Disallow the use of `debugger` |
| noDuplicateCase | Disallow duplicate case labels |
| noDuplicateClassMembers | Disallow duplicate class members |
| noDuplicateJsxProps | Disallow duplicate properties in JSX |
| noDuplicateObjectKeys | Disallow duplicate keys in object literals |
| noDuplicateParameters | Disallow duplicate function parameter names |
| noEmptyInterface | Disallow the declaration of empty interfaces |
| noExplicitAny | Disallow the `any` type usage |
| noExtraNonNullAssertion | Disallow extra non-null assertions |
| noFunctionAssign | Disallow reassigning `function` declarations |
| noImportAssign | Disallow assigning to imported bindings |
| noLabelVar | Disallow labels that share a name with a variable |
| noNonoctalDecimalEscape | Disallow `\8` and `\9` escape sequences in string literals |
| noRedeclare | Disallow variable redeclaration |
| noRedundantUseStrict | Disallow redundant `use strict` directives |
| noShadowRestrictedNames | Disallow identifiers from shadowing restricted names |
| noSparseArray | Disallow sparse arrays |
| noUnsafeDeclarationMerging | Disallow unsafe declaration merging between interfaces and classes |
| noUnsafeNegation | Disallow negating the left operand of relational operators |
| useDefaultSwitchClauseLast | Enforce default clauses in switch statements to be last |
| useNamespaceKeyword | Enforce the use of `namespace` keyword over `module` keyword to declare TypeScript namespa
ces |                                                                                                             | useSafeArraySpread | Enforce the use of safe argument usage in Array spread |
| useValidTypeof | Enforce comparing `typeof` expressions against valid strings |

This covers all the lint rules available in Biome as of the current version. The rules are organized into categori
es like Accessibility, Complexity, Correctness, Performance, Security, Style, and Suspicious.