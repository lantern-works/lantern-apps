(function() {
    
    var self;
    let Interface = {};
    let Component = {
        mounted() {
            if (self) return;
            self = this; 
            Interface.bindAll();
        }
    };
    let Action = {};
    let Data = {};




    //------------------------------------------------------------------------
    // data
    Data.package = "umbriel";
    Data.icons = {"bed":"bed","wtr":"tint","net":"globe","clo":"tshirt","eat":"utensils","pwr":"plug","med":"prescription-bottle-alt","ful":"gas-pump","ven":"building","sit":"exclamation","obs":"hand-paper"};
    Data.categories = {"main":[{"label":"Place","tag":"ven"},{"label":"Resource","tag":"rsc"},{"label":"Obstacle","tag":"obs"},{"label":"Situation","tag":"sit"}],"rsc":[{"label":"Bed","tag":"bed"},{"label":"Clothing","tag":"clo"},{"label":"Food","tag":"eat"},{"label":"Fuel","tag":"ful"},{"label":"Internet","tag":"net"},{"label":"Medical","tag":"med"},{"label":"Power","tag":"pwr"},{"label":"Water","tag":"wtr"}],"ven":[{"label":"Shelter","tag":"shl"},{"label":"Relief Camp","tag":"cmp"},{"label":"Hospital","tag":"hsp"},{"label":"Operating Base","tag":"bse"}],"obs":[{"label":"Road Debris","tag":"rdb"},{"label":"Detour","tag":"dtr"},{"label":"Destroyed","tag":"dst"}],"sit":[{"label":"Power Outage","tag":"pwo"},{"label":"Fire","tag":"fir"},{"label":"Flooding","tag":"fld"},{"label":"Looting","tag":"lot"},{"label":"Closed by Authorities","tag":"cba"}]};
    Data.menu = {};
    Data.menu.map = [{"event": "zoom-in", "icon": "search-plus"},
                    {"event": "zoom-out", "icon": "search-minus"},
                    {"event": "marker-add", "icon": "plus-circle"}];

    Data.menu.marker = [{"event": "zoom-in", "icon": "search-plus"},
                    {"event": "zoom-out", "icon": "search-minus"},
                    {"event": "marker-edit", "icon": "edit"}];

    //------------------------------------------------------------------------
    // explicit user actions, button pushes, choices
    /**
    * User tapped or clicked on a marker
    */
    Action.selectMarkerOnMap = (marker) => {

        if (LT.view.menu.isLocked()) return;
        if (Interface.waitingForMarkerMove()) return;
        marker.inspect();
        self.latlng = marker.latlng;
        LT.atlas.removePointer();
        self.target_marker = marker;
        Interface.openRadial(Data.menu.marker);

        // close radial menu if another user modified our target
        marker.once("update", (data) => {
            LT.view.menu.close();
            LT.view.menu.unlock();
        });
    }

    /**
    * User tapped or clicked on a point on the map
    */
    Action.selectPointOnMap = (e) => {
        if (LT.view.menu.isLocked()) return;
        Interface.clearMarker();
        self.latlng = e.latlng;
        Interface.openRadial(Data.menu.map);            
    }

    /**
    * User wants to zoom in
    */
    Action.zoomToPoint = (e) => {
        LT.atlas.zoomToPoint(self.latlng);
        LT.view.menu.unlock();
    }

    Action.zoomIn = () => {
        LT.atlas.map.zoomIn();
    }

    /**
    * User wants to zoom out
    */
    Action.zoomOut = () => {
        LT.atlas.map.zoomOut();
        LT.atlas.map.once("moveend", () => {
            LT.atlas.removePointer();
            LT.view.menu.unlock();
        });
    }

    /**
    * User wants to save marker to database
    */
    Action.saveMarker = () => {


        if (self.is_saving) return;
        
        self.is_saving = true;

        self.draft_marker.once("save", () => {
            // make sure save event is intended from this app
            console.log("[a:report]".padEnd(20, " ") + " saved marker", self.draft_marker.id);               
            self.draft_marker.layer.dragging.disable();
            self.is_saving = false;
            self.draft_marker = null;
            LT.view.menu.unlock();
        });
        
        self.draft_marker.save(Data.package);
        self.prompt_draft_save = false;
        self.menu = {};
    }



    /**
    * User wants to move marker
    */
    Action.relocateMarker = () => {

        self.target_marker.layer.dragging.enable();
        let original_icon = self.target_marker.getIcon();
        self.target_marker.setIcon("arrows-alt");
        self.menu = {};
        self.target_marker.once("move", (val) => {
            console.log("[a:radiant]".padEnd(20, " ") + " moved marker with tags: ", self.target_marker.tags.join(", "));
            self.target_marker.setIcon(original_icon);
            self.target_marker.layer.dragging.disable();
            self.target_marker.save(Data.package,"geohash");

            setTimeout(() => {
                LT.view.menu.unlock();
            }, 300);
        });

    }

    /**
    * User wants to drop / remove marker
    */
    Action.dropMarker = () => {
        self.menu = {};
        self.target_marker.drop(Data.package)
            .then(() => {
                self.target_marker = null;
                LT.view.menu.unlock();                
            });
    }

    /**
    * User wants to choose menu from item,
    */
    Action.chooseFromMenu = (item) => {
        console.log(item);

        if (self.draft_marker) {
            // special actions for reporting menu
            if (Data.categories.hasOwnProperty(item.tag)) {
                if (self.menu.items && self.menu.title) {
                    self.previous = {
                        title: self.menu.title,
                        items: self.menu.items,
                        tag: item.tag
                    }
                }

                self.menu.items = Data.categories[item.tag];
                self.menu.title = item.label;
            }
            else if (self.previous.tag) {
                self.draft_marker.tag(self.previous.tag);
                self.prompt_draft_save = true;
            }
            self.draft_marker.tag(item.tag);

        }
        else if (item.hasOwnProperty("method")) {
            item.method(item);
        }
    }

    /**
    * User wants to close menu
    */
    Action.closeMenu = () => {
        self.menu = {};
        LT.view.menu.unlock();
        if (self.draft_marker) {
            self.draft_marker.hide()
            self.draft_marker = null;
        }
    }

    /**
    * User wants to navigate backwards to previous menu
    */
    Action.goToPreviousMenu = () => {
        if (self.is_saving) return;

        self.draft_marker.untagAll();
        self.prompt_draft_save = false;
        console.log(self.previous)

        if (self.previous.title && self.previous.items) {
            self.menu.title = self.previous.title;
            self.menu.items = self.previous.items;
            self.previous = {};
        }
    }

    //------------------------------------------------------------------------
    // interface controls
    Interface.bindAll = () => {
        // user intended actions
        LT.atlas.on("marker-click", Action.selectMarkerOnMap);
        LT.atlas.on("map-click", Action.selectPointOnMap);
        LT.atlas.on("map-double-click", Interface.removePointer);
        LT.atlas.on("map-double-click", Action.zoomIn);
        LT.view.menu.on("zoom-in", Action.zoomToPoint);
        LT.view.menu.on("zoom-out", Action.zoomOut);
        LT.view.menu.on("marker-add", Interface.promptForNewMarker);
        LT.view.menu.on("marker-edit", Interface.promptForEdit);

        // side-effects of interactions guided by application
        LT.atlas.on("map-click-start", Interface.addPointer);
        window.addEventListener("resize", Interface.closeRadial);

        // set up custom icons for menu

        for (var idx in Data.categories) {
            let menu = Data.categories[idx];
            menu.forEach((item) => {
                if (Data.icons.hasOwnProperty(item.tag)) {
                    // only show sub-menu icons
                    if (!Data.categories.hasOwnProperty(item.tag)) {
                        item.icon_class = 'fa fa-' + Data.icons[item.tag];
                        item.tag_class = "tag-icon " + item.tag;
                        if (idx != "main") {
                            item.tag_class += " " + idx;
                        }
                    }
                }
            })
        }


    }

    Interface.promptForNewMarker = () => {
        console.log("new marker", self.latlng); 

        self.draft_marker = new LX.MarkerItem();
        self.draft_marker.geohash = LV.Geohash.encode(self.latlng.lat, self.latlng.lng);
        self.draft_marker.show();
        self.draft_marker.layer.dragging.enable();


        self.draft_marker.on("tag", () => {
            self.draft_marker.setIcons(Data.icons);
        });

        self.draft_marker.on("untag", () => {                  
            self.draft_marker.setIcons(Data.icons);
        });

        self.menu = {
            title: "What's here?"
        }
        self.menu.items = Data.categories.main;
    }

    Interface.promptForEdit = () => {
        LT.view.menu.lock();
        self.menu = {title: "Marker"};
        self.menu.items = [{"label":"Move", "method": Action.relocateMarker}, 
                    {"label":"Delete", "method": Action.dropMarker}];
    }


    Interface.clearMarker = () => {
        self.target_marker = null;
    }

    Interface.addPointer = (e) => {
        if (LT.view.menu.isLocked()) return;
        self.latlng = e.latlng;
        LT.atlas.addPointer(self.latlng);
    }

    Interface.removePointer = (e) => {
        LT.atlas.removePointer();
    }

    Interface.openRadial = (items) => {
        LT.atlas.moveFromEdge(self.latlng)
            .then(() => {        
                return LT.atlas.moveFromEdge(self.latlng)
            })
            .then(() => {
                let pos = LT.atlas.map.latLngToContainerPoint(self.latlng);
                LT.view.menu.open(items, pos);
                LT.view.menu.lock();
                // clicking anywhere on the mask element closes radial menu
                LT.view.menu.once("close", () => {
                    LT.atlas.removePointer();
                });
            });
    }

    Interface.closeRadial = () => {
        if (LT.view.menu.isOpen()) {
            LT.view.menu.close();
            LT.view.menu.unlock();                
        }
    }

    Interface.waitingForMarkerMove = () => {
        if (self.target_marker && self.target_marker.getIcon() == "arrows-alt") return;
    }



    //------------------------------------------------------------------------
    // starting data for view
    Component.data = {
        target_marker: null,
        draft_marker: null,
        prompt_draft_save: false,
        menu: {
            title: null,
            items: null
        },
        previous: {},
        latlng: null,
        is_saving: false
    }

    // methods available
    Component.methods = {
        closeMenu: Action.closeMenu,
        chooseFromMenu: Action.chooseFromMenu,
        saveMarker: Action.saveMarker,
        goToPreviousMenu: Action.goToPreviousMenu
    }


    // compute marker titles
    Component.computed = {};
    Component.computed.marker_title = () => {
        if (!self.target_marker) return null;
        let title = "";
        let cat = "";
        for (var idx in Data.categories) {
            let item = Data.categories[idx];
            for (var idy in item) {
                let tag = item[idy].tag;
                if (self.target_marker.tags.indexOf(tag) != -1) {
                    if (idx == "main") {
                        cat = item[idy].label;
                    }
                    else {
                        title = item[idy].label;
                        return cat + " — " + title;
                    }
                }
                
            }
        }
        return "Marker";
    }




    //------------------------------------------------------------------------
    return Component;
}());