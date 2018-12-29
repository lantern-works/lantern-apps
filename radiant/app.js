(function() {
    
    //------------------------------------------------------------------------
    const package_name = "umbriel";

    const icon_map = {
        "bed": "bed",
        "wtr": "tint",
        "net": "globe",
        "clo": "tshirt",
        "eat": "utensils",
        "pwr": "plug",
        "med": "prescription-bottle-alt",
        "ful": "gas-pump",
        "ven": "building",
        "sit": "exclamation",
        "obs": "hand-paper"
    }

    const menus = {
        "main": [
                {"label": "Place", "tag": "ven"}, 
                {"label": "Resource", "tag": "rsc"},
                {"label": "Obstacle", "tag": "obs"},
                {"label": "Situation", "tag": "sit"}
            ],
        "rsc": [
            {"label": "Bed", "tag": "bed"},
            {"label": "Clothing", "tag": "clo"},
            {"label": "Food", "tag": "eat"}, 
            {"label": "Fuel", "tag": "ful"},
            {"label": "Internet", "tag": "net"},
            {"label": "Medical", "tag": "med"},
            {"label": "Power", "tag": "pwr"},
            {"label": "Water", "tag": "wtr"}
        ],
        "ven": [
            {"label": "Shelter", "tag": "shl"}, 
            {"label": "Relief Camp", "tag": "cmp"},
            {"label": "Hospital", "tag": "hsp"},
            {"label": "Operating Base", "tag": "bse"}
        ],
        "obs": [
            {"label": "Road Debris", "tag": "rdb"},
            {"label": "Detour", "tag": "dtr"},
            {"label": "Destroyed", "tag": "dst"}
        ],
        "sit": [
            {"label": "Power Outage", "tag": "pwo"},
            {"label": "Fire", "tag": "fir"},
            {"label": "Flooding", "tag": "fld"},
            {"label": "Looting", "tag": "lot"},
            {"label": "Closed by Authorities", "tag": "cba"}
        ]
    }
    


    //------------------------------------------------------------------------
    var $data;



    //------------------------------------------------------------------------
    for (var idx in menus) {
        let menu = menus[idx];
        menu.forEach((item) => {
            if (icon_map.hasOwnProperty(item.tag)) {
                // only show sub-menu icons
                if (!menus.hasOwnProperty(item.tag)) {
                    item.icon_class = 'fa fa-' + icon_map[item.tag];
                    item.tag_class = "tag-icon " + item.tag;
                    if (idx != "main") {
                        item.tag_class += " " + idx;
                    }
                }
            }
        })
    }



    //------------------------------------------------------------------------
    const getParentTag = (tag) => {
        for (var idx in menus) {
            var menu = menus[idx];
            for (var idy in menu) {
                if (menu[idy].tag == tag) {
                    return idx;
                }   
            }
        }
    }


    /**
    * Create a new draft marker for the user to annotate 
    */
    const onMenuMarkerAdd = (latlng) => {
         
        setTimeout(() => {
            LT.view.menu.lock();
        }, 500);
        
        let marker = new LX.MarkerItem();
        marker.geohash = LV.Geohash.encode(latlng.lat, latlng.lng);
        marker.show();

        marker.layer.dragging.enable();

        $data.marker_id = marker.id;
        $data.allow_save = false;
        $data.prev_menu = null;
        $data.prev_title = null;
        $data.menu = menus.main;
        $data.title = "What's here?"

        marker.on("tag", () => {
            marker.setIcons(icon_map);
        });

        marker.on("untag", () => {                  
            marker.setIcons(icon_map);
        });

        $data.marker = marker;
    }



    //------------------------------------------------------------------------
    const editMarker = (marker) => {
        setTimeout(() => {
            LT.view.menu.lock();
            $data.title = "Marker";
        }, 200);
    }

    const dropMarker = () => {
        $data.marker.drop(package_name)
            .then(() => {
                $data.title = "";
                LT.view.menu.unlock();                
            });
    }


    //------------------------------------------------------------------------
    const moveFromEdge = (latlng) => {
        return new Promise(function(resolve, reject) {
            // are we too close to the edge for our menu?
            let pos = LT.atlas.map.latLngToContainerPoint(latlng);
            let dimensions = document.getElementById("map").getBoundingClientRect()
            let margin = 110;
            let center_point = LT.atlas.map.getSize().divideBy(2);

            if (pos.x < margin || pos.x > dimensions.width-margin) {
                let direction = (pos.x < margin ? "subtract" : "add");
                let target_point = center_point[direction]([margin, 0]);
                let target_latlng = LT.atlas.map.containerPointToLatLng(target_point);
                LT.atlas.map.panTo(target_latlng);
                LT.atlas.map.once("moveend", () => {
                    resolve(latlng);
                });
            } 
            else if (pos.y < margin || pos.y > dimensions.height-margin) {
                let direction = (pos.y < margin ? "subtract" : "add");
                let target_point = center_point[direction]([0,margin]);
                let target_latlng = LT.atlas.map.containerPointToLatLng(target_point);
                LT.atlas.map.panTo(target_latlng);
                LT.atlas.map.once("moveend", () => {
                    resolve(latlng);
                });
            } 
            else {
                resolve(latlng);
            }
        });
    }    

    /**
    * Changes marker position and shares with network
    */
    const moveMarker = () => {
        
        LT.view.menu.lock();
        $data.title = "";
        $data.marker.layer.dragging.enable();
        let original_icon = $data.marker.getIcon();
        $data.marker.setIcon("arrows-alt");
        $data.marker.once("move", (val) => {
            console.log("[a:radiant]".padEnd(20, " ") + " moved marker with tags: ", $data.marker.tags.join(", "));
            $data.marker.setIcon(original_icon);
            $data.marker.layer.dragging.disable();
            $data.marker.save(package_name,"geohash");

            setTimeout(() => {
                LT.view.menu.unlock();
            }, 500);
        });
    }



    //------------------------------------------------------------------------
    /**
    * Map Click
    */
    const onMapClick = function(e) {
        if (LT.view.menu.isLocked()) {
            return;
        }
        
        moveFromEdge(e.latlng)        
            .then(moveFromEdge)
            .then(() => {
                let pos = LT.atlas.map.latLngToContainerPoint(e.latlng);
                
                let items = [
                    {
                        "event": "zoom-in",
                        "icon": "search-plus",
                        "method": () => {
                            LT.atlas.zoomToPoint(e.latlng);
                        }
                    },
                    {
                        "event": "zoom-out",
                        "icon": "search-minus"
                    },
                    {
                        "event": "marker-add",
                        "icon": "plus-circle",
                        "method": () => {
                            LT.atlas.zoomToPoint(e.latlng);
                            return e.latlng;
                        }
                    }
                ];

                LT.view.menu.open(items, pos);
                LT.view.menu.lock();
                LT.view.menu.once("close", () => {
                    setTimeout(() => {
                        LT.view.menu.unlock();
                        LT.atlas.removePointer();
                    }, 50);
                });
            });
    }


    /**
    * Marker Click
    */
    const onMarkerClick = function(marker) {

        if (LT.view.menu.isLocked()) {
            return;
        }

        // skip marker marked already for movement
        if (marker.getIcon() == "arrows-alt") {
            return;
        }

        $data.marker = marker;
        $data.marker.inspect();
        $data.title = "";
        moveFromEdge($data.marker.latlng)
            .then(moveFromEdge)
            .then(() => {
                let pos = LT.atlas.map.latLngToContainerPoint($data.marker.latlng);
                let menu_items = [
                    {
                        "event": "zoom-in",
                        "icon": "search-plus",
                        "method": () => {
                            LT.atlas.zoomToPoint($data.marker.latlng);
                        }
                    },
                    {
                        "event": "zoom-out",
                        "icon": "search-minus"
                    },
                    {
                        "event": "marker-edit",
                        "icon": "edit",
                        "method": () => {
                            editMarker($data.marker.latlng);
                        }
                    }
                ];
                LT.view.menu.open(menu_items, pos);

                LT.view.menu.lock();
                $data.marker.once("hide", () => {
                    LT.view.menu.close();
                    LT.atlas.removePointer();
                    $data.title = "";
                });

                LT.view.menu.once("close", () => {
                    setTimeout(() => {
                        LT.view.menu.unlock();
                        LT.atlas.removePointer();
                    }, 50);
                });

                $data.marker.once("move", () => {
                    LT.view.menu.close();
                    $data.title = "";
                });
            
            });
    }



    //------------------------------------------------------------------------
    var self = {
        methods: {
            close: function() {
                $data.title = null;
                LT.view.menu.unlock();
            },
            chooseItem: function(item) {
                if (item.hasOwnProperty("method")) {
                    item.method(item);
                }
            }
        },
        data: {
            title: "",
            marker: null,
            menu: [
                {"label":"Move", "method": moveMarker}, 
                {"label":"Delete", "method": dropMarker}
            ]
        },
        open: false,
        mounted() {
            var map_clicked = 0;
            $data = this.$data;

            // show pie menu for marker-specific contextual actions
            LT.atlas.on("marker-click", onMarkerClick);


            // show pie menu for general map interactions
            LT.atlas.on("map-click", onMapClick);


            LT.atlas.on("map-click-start", (e) => {
                if (!LT.view.menu.isLocked()) {
                    LT.atlas.addPointer(e.latlng);
                }
            })

            // close pie menu on resize
            window.addEventListener("resize", function() {
                LT.view.menu.close();
            });

            // zoom out action
            LT.view.menu.on("zoom-out", () => {
                LT.atlas.map.zoomOut(2);
                LT.atlas.map.once("moveend", () => {
                    LT.atlas.removePointer();
                });
            });

        }
    };



    return self;
}());