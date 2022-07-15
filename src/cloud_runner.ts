const URL =
  localStorage.getItem('cloud-runner-url') ||
  process.env.REACT_APP_CLOUD_RUNNER_URL ||
  'http://localhost:5555/jsonrpc'

export async function runFilter(events: any[], filter: string) {
  const response = await fetch(URL, {
    method: "POST",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: (new Date()).getTime(),
      method: "run",
      params: { events, filter }
    })
  })

  const json = await response.json()

  if (json.error) {
    throw new Error(json.error.message)
  }
  return json.result
}
