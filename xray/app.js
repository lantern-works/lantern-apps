/**
* Inspects a selected marker to reveal data and real-time insights
*/
(function() {
    
    var self;
    var targetMarker;
    let Interface = {};
    let Component = {
        mounted() {
            if (self) return;
            self = this; 
            Interface.bindAll();
        }
    };
    let Action = {};
    let Data = {}
   
    //------------------------------------------------------------------------
    Data.package = "umbriel@0.0.1";
    Data.categories = {"main":[{"label":"Place","tag":"ven"},{"label":"Resource","tag":"rsc"},{"label":"Obstacle","tag":"obs"},{"label":"Situation","tag":"sit"}],"rsc":[{"label":"Bed","tag":"bed"},{"label":"Clothing","tag":"clo"},{"label":"Food","tag":"eat"},{"label":"Fuel","tag":"ful"},{"label":"Internet","tag":"net"},{"label":"Medical","tag":"med"},{"label":"Power","tag":"pwr"},{"label":"Water","tag":"wtr"}],"ven":[{"label":"Shelter","tag":"shl"},{"label":"Relief Camp","tag":"cmp"},{"label":"Hospital","tag":"hsp"},{"label":"Operating Base","tag":"bse"}],"obs":[{"label":"Road Debris","tag":"rdb"},{"label":"Detour","tag":"dtr"},{"label":"Destroyed","tag":"dst"}],"sit":[{"label":"Power Outage","tag":"pwo"},{"label":"Fire","tag":"fir"},{"label":"Flooding","tag":"fld"},{"label":"Looting","tag":"lot"},{"label":"Closed by Authorities","tag":"cba"}]};
   
    //------------------------------------------------------------------------
    Interface.bindAll = () => {
        
        Object.keys(LT.atlas.markers).forEach((k)=> {
            let marker = LT.atlas.markers[k];
            marker.on("focus", Interface.selectMarker)
        });
        LT.atlas.on("marker-add", (marker) => {
            marker.on("focus", Interface.selectMarker)
        })
        LT.atlas.on("marker-click", Interface.selectMarker)   
        LT.user.feed.on("drop", (e) => {
            if (self.marker && e.id === self.marker.id) {
                // don't display a marker that has been dropped
                self.marker = null;
            }
        });
    }

    Interface.selectMarker = (marker) => {
        if (self.marker === marker) {
            return;
        }
        self.marker = marker;
        console.log(`(xray) focus on marker ${self.marker.id}`)
        marker.inspect()
    }

 
    //------------------------------------------------------------------------

    /**
    * User wants to move marker
    */
    Action.relocateMarker = () => {
        targetMarker = self.marker;
        targetMarker.layer.dragging.enable();
        let original_icon = self.marker.getIcon();
        targetMarker.setIcon("arrows-alt");
        self.menu = {};
        console.log(`(xray) ready for relocation of ${self.marker.id}`)
        targetMarker.once("move", (val) => {
            targetMarker.setIcon(original_icon);
            targetMarker.layer.dragging.disable();
            // add user to list of editors
            targetMarker.editor(LT.user.username);
            targetMarker.save(["editors","geohash"]);
        });
        self.marker = null;
    }

    /**
    * User wants others to be on the same page and see this marker detail sheet
    */
    Action.pingMarker = () => {
        self.marker.ping = [LT.user.username, new Date().getTime()]
        self.marker.save(["ping"]).then(() => {
            console.log(`(xray) sent ping for marker ${self.marker.id}`)
        })
    }


    /**
    * User wants to drop / remove marker
    */
    Action.dropMarker = () => {
        let pkg = new LX.Package(Data.package, LT.db);
        pkg.remove(self.marker).then(() => {
            console.log(`(xray) removed marker ${self.marker.id}`)
            self.marker.drop()
        });
    }

    //------------------------------------------------------------------------
    Component.data = {
        "marker": null,
        "username": LT.user.username,
        "readyToDrop": false
    }
    Component.methods = {
        ping: Action.pingMarker,
        move: Action.relocateMarker,
        drop: Action.dropMarker,
        scoreUp: () => {
            if (self.marker.score > 0.9) {
                return
            }
            if (!self.marker.score) {
                self.marker.score = 0
            }
            self.marker.score += 0.10
            if (self.marker.score > 1.0) {
                self.marker.score = 1.0
            }
            self.marker.save(["score"]);
        },
        promptForDrop: () => {
            self.readyToDrop = true
        },
        scoreDown: () => {
            if (self.marker.score < 0.10) {
                return
            }
            self.marker.score -= 0.10
            if (self.marker.score < 0) {
                self.marker.score = 0
            }
            self.marker.save(["score"]);
        },
        close: () => {
            self.readyToDrop = false
            self.marker = null;
        }
    }
    // compute marker titles
    Component.computed = {};
    Component.computed.marker_title = () => {
        if (!self.marker) return null;
        return self.marker.getCategory(Data.categories);
    }
    return Component;
}());