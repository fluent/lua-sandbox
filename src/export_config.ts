const luaparse = require('luaparse')
const luamin = require('luamin')


const config = (script: string) => `[INPUT]
    name tail
    read_from_head true
    exit_on_eof true
    path data.log

[Filter]
    Name    lua
    Match   *
    code    ${script}
    call    cb_filter

[OUTPUT]
    name stdout
`

function minify(script: string) {
  const ast = luaparse.parse(script)
  return luamin.minify(ast)
}

export function exportConfig(script: string) {
  const minifiedFilter = minify(script)
  const cfg = config(minifiedFilter)
  const encodedCfg = encodeURIComponent(cfg)

  const element = document.createElement('a')
  element.setAttribute('href',
                       'data:text/plain;charset=utf-8,' + encodedCfg)
  element.setAttribute('download', 'fluent-bit.conf')
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

