/**
* Used to control a device or node through user input
*/

(function () {
    var self, map, user, ctx
    let Interface = {}

    let Component = {
        mounted () {
            if (self) return
            self = this
            Interface.bindAll()
        },
        callback: (data) => {
            ctx = data.app.context
            db = ctx.db
            user = data.app.context.user
            map = data.app.context.map
        }
    }

    let Action = {}

    // ------------------------------------------------------------------------
    Interface.bindAll = () => {
        self.$root.$on('user-location', Interface.showNodeMarker)
    }




    Interface.showNodeMarker = (newGeohash) => {
        return new Promise((resolve, reject) => {
            // @todo allow more control over which package markers are linked to
            let firstPackage = ctx.packages[0]
            if (!firstPackage) {
                console.warn('(control) no available package to display marker within. ignoring location...')
                reject()
            }

            // check if we have the marker in the feed
            if (ctx.feed.activeItems.hasOwnProperty(ctx.peer)) {
                // we are watching a marker
                let marker = ctx.feed.activeItems[ctx.peer]
                marker.geohash = newGeohash
                //console.log('(track) update existing user marker', marker)
                marker.update(['geohash'])
                return resolve(marker)
            }

            // first, check if we have existing user in database
            db.get('net').get(ctx.peer).then((v,k) => {
                let marker = new LM.MarkerItem(firstPackage)
                marker.id = ctx.peer
                marker.tags = ['rsc', 'lnt']
                marker.icon = 'hdd'
                if (!v) {
                    // ready to create a new  marker
                    console.log('(control) prepare to create new node marker')
                    marker.geohash = newGeohash
                    marker.owner = user.username
                    map.addToMap(marker)
                    marker.save().then(() => {
                        marker.link(db.get('net').get(ctx.peer))
                    })
                }
                else {
                    // use existing user marker
                    marker.data = v
                    marker.geohash = newGeohash
                    console.log('(track) update existing user marker', marker)
                    marker.update(['geohash'])
                }
                resolve(marker)
            })
        })
    }


    Component.methods = {
    }

    return Component
}())