(function () {
    var self, ctx, user, db
    let Interface = {}
    let Action = {}

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {
        db.get('net').map((v,k) => {
            console.log('(diagnostics) found network node: ' + k)
            self.nodeCount++
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
        nodeCount: 0
    }

    Component.computed = {
    }

    Component.methods = {
        close: () => {
            ctx.closeOneApp('diagnostics')
        }
    }

    return Component
}())
