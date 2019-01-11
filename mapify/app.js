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
    Data.icons = {"bed":"bed","wtr":"tint","net":"globe","clo":"tshirt","eat":"utensils","pwr":"plug","med":"prescription-bottle-alt","ful":"gas-pump","ven":"building","sit":"exclamation","obs":"hand-paper"};
    Data.categories = {"main":[{"label":"Place","tag":"ven"},{"label":"Resource","tag":"rsc"},{"label":"Obstacle","tag":"obs"},{"label":"Situation","tag":"sit"}],"rsc":[{"label":"Bed","tag":"bed"},{"label":"Clothing","tag":"clo"},{"label":"Food","tag":"eat"},{"label":"Fuel","tag":"ful"},{"label":"Internet","tag":"net"},{"label":"Medical","tag":"med"},{"label":"Power","tag":"pwr"},{"label":"Water","tag":"wtr"}],"ven":[{"label":"Shelter","tag":"shl"},{"label":"Relief Camp","tag":"cmp"},{"label":"Hospital","tag":"hsp"},{"label":"Operating Base","tag":"bse"}],"obs":[{"label":"Road Debris","tag":"rdb"},{"label":"Detour","tag":"dtr"},{"label":"Destroyed","tag":"dst"}],"sit":[{"label":"Power Outage","tag":"pwo"},{"label":"Fire","tag":"fir"},{"label":"Flooding","tag":"fld"},{"label":"Looting","tag":"lot"},{"label":"Closed by Authorities","tag":"cba"}]};
 


    //------------------------------------------------------------------------

    Interface.bindAll = () => {
        // keep the UI up-to-date based on changes to marker count
        LT.atlas.on("marker-add", () => {
            self.marker_count = LT.atlas.getMarkerCount();
        });

        LT.atlas.on("marker-remove", () => {
            self.marker_count = LT.atlas.getMarkerCount();
        });


        // add map controls
        Interface.setupControls();


        // waits for user authentication
        LT.withUser(user => {
            LT.user.feed.refreshData();
             // sync with all available markers from user-specific feed
            // this is pre-filtered based on installed packages
            user.feed.on("change", (e) => {
                if (!e.data) {
                    // item was deleted
                    if (LT.atlas.markers[e.id]) {
                        LT.atlas.markers[e.id].hide();
                    }
                }
                else if (LT.atlas.markers[e.id]) {
                        let old_marker = LT.atlas.markers[e.id];
                        old_marker.refresh(e.data)
                }
                else {
                    let marker = new LX.MarkerItem(e.id, e.data);
                    marker.show();
                    marker.setIcons(Data.icons);                        
                }
            });

            setTimeout(() => {
                if (self.marker_count == -1) {
                    self.marker_count = 0;
                }  
            }, 500);

        });
    }

    /**
    * Display zoom and locate controls over the map interface
    */
    Interface.setupControls = () => {
        // add zoom in & out control
        let zoom = L.control.zoom();
        zoom.setPosition("bottomright");
        zoom.addTo(LT.atlas.map);
        
        // create custom zoom icons
        let zoom_in = document.getElementsByClassName("leaflet-control-zoom-in")[0];
        let elem = document.createElement('span');
        elem.className = "fa fa-plus";
        zoom_in.innerHTML = "";
        zoom_in.appendChild(elem);
        let zoom_out = document.getElementsByClassName("leaflet-control-zoom-out")[0];
        let elem2 = document.createElement('span');
        elem2.className = "fa fa-minus";
        zoom_out.innerHTML = "";
        zoom_out.appendChild(elem2);

        // // add locate control
        L.control.locate(LC.leaflet_locatecontrol).addTo(LT.atlas.map);
    }


    /**
    * Computes a marker title based on available categories
    */
    Interface.getCategory = (marker, categories) => {
        let title = "";
        let cat = "";
        for (var idx in categories) {
            let item = categories[idx];
            for (var idy in item) {
                let tag = item[idy].tag;
                if (marker.tags.indexOf(tag) != -1) {
                    if (idx == "main") {
                        cat = item[idy].label;
                    }
                    else {
                        title = item[idy].label;
                        return title;
                    }
                }
                
            }
        }
        return "Unknown Category";
    }

 
    //------------------------------------------------------------------------

    Component.methods = {
        searchMap: () => {
            self.show_search = !self.show_search;
        },
        fitMap: () => {
            
            if (self.snapback) {
                self.snapback=false;
                return LT.atlas.setViewFromCenterLocationCache();
            }
            
            self.snapback = true; 
            LT.user.feed.refreshData();
            LT.atlas.cacheCenterLocation(1).then(() => {
                LT.atlas.fitMapToAllMarkers();
            })
        },
        chooseFromMenu: (item) => {
            LT.atlas.zoomToPoint(item.latlng);
            self.show_search = false;
        },
        closeMenu: () => {
            self.show_search = false;
        },
        getCategory: (item) => {
            return Interface.getCategory(item, Data.categories);
        },
        getMarkerClass: (item) => {
            return "tag-icon " + item.tags.join(" ")
        },
        getMarkerIconClass: (item) => {
            let cls = "fa ";
            item.tags.forEach((tag) => {
                if (Data.icons.hasOwnProperty(tag)) {
                    cls += " fa-" + Data.icons[tag];
                }
            });
            return cls;
        }
    };

    Component.data = {
        "marker_count": -1,
        "show_search": false,
        "snapback": false,
        "markers": LT.atlas.markers
    };

    return Component;
}());