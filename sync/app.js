(function () {
    var self, ctx, user, db
    let Interface = {}
    let Action = {}

    const syncDisplayTime = 1100

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {
        let iv = null
        db.on('sync', (msg) => {
            let peers = msg['><']
            let changes = {}

            Object.keys(msg.put).forEach(item => {
                Object.keys(msg.put[item]).forEach(field => {
                    if (field !== '#' && field !== '>' && field !== '_') {
                        // only display items that have a sequence associated
                        changes[item] = changes[item] || {}
                        changes[item][field] = msg.put[item][field]
                    }
                })
            })

            //console.log(`(sync)  ${peers}`, changes)
            
            self.is_syncing = true
            if (iv) {
                clearInterval(iv)
            }
            iv = setTimeout(() => {
                self.sync_text = ''
                self.is_syncing = false
                clearInterval(iv)
                iv = null
            }, syncDisplayTime)
        })
    }

    // ------------------------------------------------------------------------
    let Component = {
        mounted () {
            if (self) return
            self = this
            Interface.bindAll()
        },
        callback: (data) => {
            ctx = data.app.context
            db = data.app.context.db
            user = data.app.context.user
        }
    }

    Component.data = {
        is_syncing: false,
        sync_text: ''
    }

    Component.computed = {
    }

    Component.methods = {
    }

    return Component
}())
