import Centrifuge, {EventNames, EventNamesToContext} from 'centrifuge'


export type Deps = {
  centrifuge: Centrifuge
}


export class CentrifugeTestClient  {

  constructor(private deps: Deps) {
    Object.values(EventNames).forEach(<Ev extends EventNames>(ev: Ev) => {
      deps.centrifuge.addListener(ev, ctx => {
        this.listen(ev, ctx)
      })
    })
  }

  listen = <Ev extends EventNames>(ev: Ev, context: EventNamesToContext[Ev]) => {
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
