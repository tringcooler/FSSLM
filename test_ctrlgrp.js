const TEST_CTRLGRP = (() => {
    
    class c_cg_sslm {
        
        constructor() {
            this.groups = [];
        }
        
        set(vset, dval) {
            let darr = [...vset];
            let dlen = darr.length;
            let dset = new Set(darr);
            let dkey = darr.sort().toString();
            let groups = this.groups;
            let group = groups[dlen];
            if(!group) {
                group = {};
                groups[dlen] = group;
            }
            let ctx = group[dkey];
            if(!ctx) {
                ctx = [dset];
                group[dkey] = ctx;
            }
            ctx[1] = dval;
        }
        
        match(vset, rvs) {
            let rinfo = {
                matches: [],
                unmatch: Infinity,
                found: false,
            };
            let qarr = [...vset];
            let qlen = qarr.length;
            let qset = new Set(qarr);
            let qkey = qarr.sort().toString();
            let groups = this.groups;
            if(groups[qlen]?.[qkey]) {
                rinfo.matches.push(groups[qlen][qkey][1]);
                rinfo.unmatch = 0;
                rinfo.found = true;
                return rinfo;
            }
            let glen = this.groups.length;
            let step = rvs ? -1 : 1;
            let stop = rvs ? i=>i>-1 : i=>i<glen;
            let delt = 0;
            for(let i = qlen + step; stop(i); i += step) {
                delt ++;
                let group = groups[i];
                if(!group) continue;
                let matches = [];
                for(let k in group) {
                    let [gset, gval] = group[k];
                    let sset, dset;
                    if(rvs) {
                        dset = qset;
                        sset = gset;
                    } else {
                        dset = gset;
                        sset = qset;
                    }
                    let is_in = true;
                    for(let v of sset) {
                        if(!dset.has(v)) {
                            is_in = false;
                            break;
                        }
                    }
                    if(is_in) {
                        matches.push(gval);
                    }
                }
                if(matches.length > 0) {
                    rinfo.matches = matches;
                    rinfo.unmatch = delt;
                    rinfo.found = true;
                    return rinfo;
                }
            }
            return rinfo;
        }
        
    }
    
    return c_cg_sslm;
    
})();
