import {useState, useEffect} from 'react'

import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import _ from 'underscore'

import { runFilter as runFilterFengari } from './fengari_runner'
import { runFilter as runFilterCloud } from './cloud_runner'

const runFilter = process.env.REACT_APP_CLOUD_RUNNER_URL || localStorage.getItem('cloud-runner-url') ?
  runFilterCloud :
  runFilterFengari

const storageKey = "flb-input-filter"

const initialInput = `{"log": "line 1"}
{"log": "line 2"}
{"log": "line 3"}
{"log": "line 4"}
{"log": "line 5"}
{"log": "line 6"}
{"log": "line 7"}
{"log": "line 8"}
{"log": "line 9"}
{"log": "line 10"}
{"log": "line 11"}
{"log": "line 12"}
{"log": "line 13"}
{"log": "line 14"}
{"log": "line 15"}`

const initialFilter = `function cb_filter(tag, ts, record)
  local number_start, number_end = record.log:find('%d+')
  local number_string = record.log:sub(number_start, number_end)
  local num = tonumber(number_string)

  if num % 15 == 0 then
    record.log = 'FizzBuzz'
  elseif num % 5 == 0 then
    record.log = 'Buzz'
  elseif num % 3 == 0 then
    record.log = 'Fizz'
  end        
  
  return 1, ts, record
end`

let fetching = false

async function run(input: string, filter: string, setOut: Function) {
  if (fetching) {
    return
  }
  const events = []
  const jsonExpressions = input.split('\n')
  for (const jsonStr of jsonExpressions) {
    if (!jsonStr.trim()) {
      continue
    }
    let obj: any
    try {
      obj = JSON.parse(jsonStr)
      events.push(obj)
    } catch (err) {
      console.error(err)
      continue
    }
  }

  let result: any[]
  try {
    fetching = true
    result = await runFilter(events, filter)
  } catch (err) {
    console.error(err)
    return
  } finally {
    fetching = false
  }

  if (events.length !== result.length) {
    console.error('Result array has different length than events array', result, events)
    return
  }

  const output = []
  const ts = 0

  for (const [i, res] of result.entries()) {
    if (res.error) {
      console.error(`Error processing event ${i}:`, res.error)
      continue
    }
    if (!res.result?.length) {
      console.error(`Invalid result for event ${i}:`, res.result)
      continue
    }

    const [code, newTs, newObj] = res.result
    let resultTs
    let resultObj
    switch (code) {
      case 0:
        resultTs = ts
        resultObj = events[i]
      break
      case 1:
        resultTs = newTs
        resultObj = newObj
      break
      case 2:
        resultTs = ts
        resultObj = newObj
      break
      default:
        /* drop record */
        continue
    }

    if (Array.isArray(newObj)) {
      // split
      for (const item of newObj) {
        output.push(JSON.stringify([resultTs, item]))
      }
    } else {
      output.push(JSON.stringify([resultTs, resultObj]))
    }
  }

  localStorage.setItem(storageKey, JSON.stringify({ input, filter }))
  setOut(output.join('\n'))
}

const debouncedRun = _.debounce(run, 1000);

function App() {
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('')
  const [out, setOut] = useState('')

  useEffect(() => {
    const data = localStorage.getItem(storageKey)
    if (data) {
      let savedState: any
      try {
        savedState = JSON.parse(data)
        if (savedState.input && savedState.filter) {
          setInput(savedState.input)
          setFilter(savedState.filter)
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      setInput(initialInput)
      setFilter(initialFilter)
    }

  }, [])

  useEffect(() => {
      debouncedRun(input, filter, setOut)
  }, [input, filter])


  function setFileInput(data: string) {
    const input = []
    for (const line of data.split('\n')) {
      input.push(JSON.stringify({log: line}))
    }
    setInput(input.join('\n'))
  }

  return (
    <div>
      <div id="control-bar">
        <button
          onClick={()=>{
            localStorage.clear()
            setTimeout(() =>  {
              window.location.reload()
            }, 200)
          }}>
          Reset
        </button>
      </div>
      <div id="code-editors">
        <div id="input-events" className="code-editor">
          <div className="code-editor-title upload-file">
            <label htmlFor="events-input"><h2>Input events</h2></label>
            <input id="events-input" type="file" onChange={(e) => {

              if (!e.target.files || !e.target.files[0]) {
                console.error('failed to read file', e)
                return
              }

              const file = e.target.files[0]
              const fileReader = new FileReader()

              fileReader.onloadend = (e) => {
                const { result } = fileReader
                if (typeof result != "string") {
                  console.error('failed to read file', e)
                  return
                }
                setFileInput(result)
              }

              fileReader.readAsText(file)
            }} />
          </div>
          <CodeMirror
            className="code-editor-cm"
            value={input}
            height="100%"
            extensions={[json()]}
            onChange={setInput}
          />
        </div>

        <div id="lua-filter" className="code-editor">
          <div className="code-editor-title upload-file">
            <label htmlFor="filter-input"><h2>Lua filter</h2></label>
            <input id="filter-input" type="file" onChange={(e) => {

              if (!e.target.files || !e.target.files[0]) {
                console.error('failed to read file', e)
                return
              }

              const file = e.target.files[0]
              const fileReader = new FileReader()

              fileReader.onloadend = (e) => {
                const { result } = fileReader
                if (typeof result != "string") {
                  console.error('failed to read file', e)
                  return
                }
                setFilter(result)
              }

              fileReader.readAsText(file)
            }} />
          </div>
          <CodeMirror
            className="code-editor-cm"
            value={filter}
            height="100%"
            extensions={[StreamLanguage.define(lua)]}
            onChange={setFilter}
          />
        </div>

        <div id="output-events" className="code-editor">
          <div className="code-editor-title">
            <h2>Output events</h2>
          </div>
          <CodeMirror
            className="code-editor-cm"
            value={out}
            height="100%"
            readOnly={true}
            extensions={[json()]}
          />
        </div>
      </div>
    </div>
);
}

export default App;
