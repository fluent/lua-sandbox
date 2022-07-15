const fengari = require("fengari-web");

const luaSupport = `
return function(_, tag, ts, obj)
  local js = require "js"

  local function _is_array(t)
    return t[1] ~= nil
  end

  local function _to_lua(o)
    local t = js.typeof(o)
    local rv
    if t == 'undefined' or o == js.null then
      rv = nil
    elseif t == 'number' or t == 'boolean' or t == 'string' then
      rv = o
    elseif t == 'object' then
      rv = {}
      if js.instanceof(o, js.global.Array) then
        for item in js.of(o) do
          rv[#rv + 1] = _to_lua(item)
        end
      else
        for key in js.of(js.global.Object:keys(o)) do
          rv[key] = _to_lua(o[key])
        end
      end
    else
      error("Unsupported type")
    end
    return rv
  end

  local function _to_js(o)
    local t = type(o)

    if t ~= 'table' then
      return o
    end

    local rv
    if _is_array(o) then
      rv = js.new(js.global.Array)
      for _, v in ipairs(o) do
        rv:push(_to_js(v))
      end
    else
      rv = js.new(js.global.Object)
      for k, v in pairs(o) do
        rv[k] = _to_js(v)
      end
    end
    return rv
  end

  local code, ts, record = cb_filter(_to_lua(tag), _to_lua(ts), _to_lua(obj))
  return _to_js({code, ts, record})
end
`;

export async function runFilter(events: any[], filter: string) {
  const filterScript = filter + '\n' + luaSupport
  const luaFn = fengari.load(filterScript)()
  const result = []
  const ts = 0
  const tag = "my-tag"
  for (const [i, event] of events.entries()) {
    try {
      const [code, newTs, newObj] = luaFn(tag, ts, event)
      result.push({result: [code, newTs, newObj]})
    } catch (err) {
      result.push({error: `error processing event ${i + 1}: ${err}`})
    }
  }
  return result
}
