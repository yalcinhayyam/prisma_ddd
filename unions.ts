type Foo = { a: 'single', b: number }
type Baz = { a: 'multiple', c: boolean }


// If need to use union type you must use least 1 same key for chack
const foo = (): Foo | Baz => ({ a: 'multiple', c: !!34 })

const isHasB = (value: Foo | Baz): value is Foo => {
    return value.a == 'single' || 'c' in value
}
const value = foo()
if (value.a == 'multiple') {
    console.log(value.c)
}

if (!isHasB(value)) {
    console.log(value.c)
}
// Not Recomended
if ('c' in value) {
    console.log(value.c)
}

