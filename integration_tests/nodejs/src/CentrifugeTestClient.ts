import Centrifuge, {EventName, EventNameToContext} from 'centrifuge'


export type Deps = {
  centrifuge: Centrifuge
}


export class CentrifugeTestClient  {
  constructor(private deps: Deps) {
    Object.values(EventName).forEach(<Ev extends EventName>(ev: Ev) => {
      deps.centrifuge.addListener(ev, ctx => {
        this.listen(ev, ctx)
      })
    })
  }

  listen = <Ev extends EventName>(ev: Ev, context: EventNameToContext[Ev]) => {
    console.log('received ' + ev + ' with context ' + JSON.stringify(context))
  }
  initialize = () => {
    this.deps.centrifuge.connect()
  }

  sendMessage () {
    this.deps.centrifuge.connect()
  }


  close = () => {
    this.deps.centrifuge.disconnect()
  }
}
