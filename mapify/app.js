/**
* Renders markers to a map-based canvas and counts the number of markers
* Also offers a search-box to find relevant markers
*/
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
    Interface.refresh = () => {
       LT.user.feed.forEachItem((v,k) => {
            if (v && v.g && v.o && v.t) {
                // this is a marker
                if (!LT.atlas.markers.hasOwnProperty(k) ) {
                    Interface.showMarker({id: k, data: v})
                }
                else {
                    // exists in UI
                    let marker = LT.atlas.markers[k];
                    marker.refresh(v)
                }
            }
            else {
                Interface.hideMarker({id: k})
            }
        })
    }

    Interface.showMarker = (e) => {
        if (!LT.atlas.markers.hasOwnProperty(e.id) && e.data.g && e.data.o && e.data.t) {
            let marker = new LM.MarkerItem(LT.db);
            marker.id = e.id;
            marker.data = e.data
            //console.log("(mapify) show marker", marker.id, marker.geohash);
            marker.show();
            marker.setIcons(Data.icons);
        }
    }

    Interface.hideMarker = (e) => {
        if (LT.atlas.markers[e.id]) {
            console.log("(mapify) hide existing marker", e.id)
            LT.atlas.markers[e.id].hide();
        }
    }

    Interface.refreshMarker = (e) => {
        if (LT.atlas.markers[e.id]) {
            let marker = LT.atlas.markers[e.id];
            let obj = {}
            obj[e.key] = e.data
            marker.refresh(obj);

            // if this is a ping, open details on map
            if (e.key && e.key == 'p') {
                LT.atlas.panToPoint(marker.latlng);
                marker.focus()
            }
        }
    }

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

        // visualize known markers
        // sync with all available markers from user-specific feed
        // this is pre-filtered based on installed packages
        Interface.refresh();
        LT.user.feed.on("change", Interface.refreshMarker);
        LT.user.feed.on("add", Interface.showMarker);
        LT.user.feed.on("drop", Interface.hideMarker);

        setTimeout(() => {
            if (self.marker_count == -1) {
                self.marker_count = 0;
            }  
        }, 500);
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
        L.control.locate( {
            returnToPreviousBounds: true,
            cacheLocation: true,
            showCompass: true,
            flyTo: false,
            showPopup: false,
            setView: 'untilPanOrZoom',
            position: 'bottomright'
        }).addTo(LT.atlas.map);
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
            LT.atlas.cacheCenterLocation(0);
            LT.atlas.fitMapToAllMarkers();
            
        },
        chooseFromMenu: (item) => {
            LT.atlas.panToPoint(item.latlng);
            self.show_search = false;
        },
        closeMenu: () => {
            self.show_search = false;
        },
        getCategory: (item) => {
            return item.getCategory(Data.categories)
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