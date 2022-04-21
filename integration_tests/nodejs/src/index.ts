import {CentrifugeTestClient} from './CentrifugeTestClient'
import Centrifuge from 'Centrifuge'
import * as ws from 'ws'



const sleep = (ms: number) => new Promise((resolve) => setTimeout(() => {resolve(null)}, ms))



const run = async () => {
  const client = new CentrifugeTestClient({
    centrifuge: new Centrifuge("ws://localhost:8000/connection/websocket", {
      websocket: ws
    })
  })

  client.initialize()

  await sleep(5000);

  client.close()
  await sleep(5000);

}


run()


