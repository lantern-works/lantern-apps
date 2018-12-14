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
          
        LT.view.menu.lock();
        
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
	const config = {
		methods: {
			chooseMenuItem: (item) => {
				if (menus.hasOwnProperty(item.tag)) {
					if ($data.menu && $data.title) {
						$data.prev_menu = $data.menu;
						$data.prev_title = $data.title;
						$data.prev_tag = item.tag;
					}
					$data.menu = menus[item.tag];
					$data.title = item.label;
				}
				else if ($data.prev_tag) {
					$data.marker.tag($data.prev_tag)
					$data.allow_save = true;
				}
				$data.marker.tag(item.tag);

			},
			saveMarker: () => {
				if ($data.is_saving) return;
				
				$data.is_saving = true;

				$data.marker.once("save", () => {
					// make sure save event is intended from this app
					console.log("[a:report]".padEnd(20, " ") + " saved marker", $data.marker.id);               
					$data.marker.layer.dragging.disable();
					$data.is_saving = false;
					$data.allow_save = false;
					$data.title = null;
					$data.marker = null;
					LT.view.menu.unlock();
				});
				
				$data.marker.save(package_name);
			},
			goBack: () => {
				if ($data.is_saving) return;
				$data.allow_save = false;

				$data.marker.untagAll();

				if ($data.prev_menu) {
					$data.menu = $data.prev_menu;
					$data.title = $data.prev_title;
					$data.prev_menu = null;
					$data.prev_title = null;
					$data.prev_tag = null;
				}

			},
			close: () => {
				$data.title = null;
				LT.view.menu.unlock();
				if ($data.marker && $data.marker.mode == "draft") {
					$data.marker.hide();
				}
                LT.atlas.map.zoomOut(2);
			}
		},
		computed: {
		},
		data: {
			title: null,
			icon_map: icon_map,
			menu: null,
			prev_tag: null,
			prev_menu: null,
			prev_title: null,
			allow_save: false,
			is_saving: false,
			marker: null
		},
		open: false,
		mounted() {
            LT.view.menu.on("marker-add", onMenuMarkerAdd);
			$data = this.$data;

		}
	};

	return config;
}());