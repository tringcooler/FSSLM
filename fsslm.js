const FSSLM = (()=> {
    
    const [
    
        PL_MA_SRC, PR_MA_MSK, PR_MA_LEN,
        MTD_MA_INT,
        
        PL_N_NXT, PR_N_LOOPCNT, PR_N_NEXTCNT,
        FLG_N_VALID,
        
        PL_W_CUR,
        MTD_W_ND_NEW, MTD_W_ND_LEN, MTD_W_ND_ITER,
        
        PL_W_STAT,
        MTD_W_INIT_STAT, MTD_W_RET,
        
        PL_W_NDINFO,
        MTD_W_STRIP_VARR,
        MTD_W_PARSE_NODE_INFO, MTD_W_GET_NODE_INFO,
        MTD_W_NEW_SUB_NODE, MTD_W_CLONE_SUB_KEY, MTD_W_GET_SUB_NODE,
        
        PR_W_ROOT,
        MTD_W_PRE_WALK,
        
        PR_W_NID, PR_W_REPR,
        
        PR_G_ROOT, PR_G_ROOT_RVS,
        
        KEY_ND_LOOPBACK,
        KEY_ND_TOP,
    
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    const assert = c => {
        if(!c) {
            throw Error('assert error');
        }
    };
    
    const sparse_popcnt = (v, v1 = 1) => {
        let c = 0;
        while(v) {
            v &= v - v1;
            c ++;
        }
        return c
    };
    
    class c_masked_arr {
            
        constructor(src) {
            this[PL_MA_SRC] = src;
            this[PR_MA_MSK] = this[MTD_MA_INT](0);
            this[PR_MA_LEN] = src.length;
        }
        
        clone() {
            let r = new c_masked_arr(this[PL_MA_SRC]);
            r[PR_MA_MSK] = this[PR_MA_MSK];
            r[PR_MA_LEN] = this[PR_MA_LEN];
            return r;
        }
        
        get length() {
            return this[PR_MA_LEN];
        }
        
        get src() {
            return this[PL_MA_SRC];
        }
        
        [MTD_MA_INT](v) {
            if(this[PL_MA_SRC].length > 52) {
                return BigInt(v);
            } else {
                return v;
            }
        }
        
        *coiter() {
            let src = this[PL_MA_SRC];
            let msk = this[PR_MA_MSK];
            let v0 = this[MTD_MA_INT](0);
            let v1 = this[MTD_MA_INT](1);
            for(let i = v0; i < src.length; i++) {
                let m = ((msk >> i) & v1);
                if(m) continue;
                let v = src[i];
                let comsk = (msk | (v1 << i));
                let coarr = new c_masked_arr(src);
                coarr[PR_MA_MSK] = comsk;
                coarr[PR_MA_LEN] = this[PR_MA_LEN] - 1;
                yield [v, coarr];
            }
        }
        
        *[Symbol.iterator]() {
            for(let [v, _] of this.coiter()) {
                yield v;
            }
        }
        
        merge(dst) {
            let src = this[PL_MA_SRC];
            if(src !== dst[PL_MA_SRC]) {
                throw Error('merge with different sources');
            }
            let smsk = this[PR_MA_MSK];
            let dmsk = dst[PR_MA_MSK];
            this[PR_MA_MSK] = (smsk | dmsk);
            this[PR_MA_LEN] -= sparse_popcnt(~smsk & dmsk, this[MTD_MA_INT](1));
            return this;
        }
        
        inverse() {
            let v1 = this[MTD_MA_INT](1);
            let slen = this[PL_MA_SRC].length;
            this[PR_MA_MSK] = ~this[PR_MA_MSK] & ((v1 << this[MTD_MA_INT](slen)) - v1);
            this[PR_MA_LEN] = slen - this[PR_MA_LEN];
            return this;
        }
        
        empty() {
            let v1 = this[MTD_MA_INT](1);
            let slen = this[PL_MA_SRC].length;
            this[PR_MA_MSK] = (v1 << this[MTD_MA_INT](slen)) - v1;
            this[PR_MA_LEN] = 0;
            return this;
        }
        
    }
    
    const meta_fsslm = (mapops) => {
        
        class c_ss_node {
            
            constructor() {
                this[PL_N_NXT] = mapops.new();
                this[PR_N_LOOPCNT] = 0;
                this[PR_N_NEXTCNT] = 0;
                this[FLG_N_VALID] = false;
            }
            
            get length() {
                return this[PR_N_LOOPCNT];
            }
            
            get length_next() {
                return this[PR_N_NEXTCNT];
            }
            
            get valid() {
                return this[FLG_N_VALID];
            }
            
            reg() {
                this[FLG_N_VALID] || (this[FLG_N_VALID] = true);
                return this;
            }
            
            next(v) {
                let nxt = mapops.get(this[PL_N_NXT], v);
                return nxt ?? null;
            }
            
            *iter() {
                yield *mapops.iter(this[PL_N_NXT]);
            }
            
            set_next(v, nnd) {
                assert(nnd !== KEY_ND_LOOPBACK);
                mapops.set(this[PL_N_NXT], v, nnd);
                this[PR_N_NEXTCNT] ++;
            }
            
            set_loops(vset) {
                let cnt = 0;
                for(let v of vset) {
                    mapops.set(this[PL_N_NXT], v, KEY_ND_LOOPBACK);
                    cnt ++;
                }
                this[PR_N_LOOPCNT] += cnt;
                return cnt;
            }
            
        }
        
        class c_ss_walker {
            
            constructor(start, varr) {
                this[PL_W_CUR] = [[start, varr, null, null, 0]];
            }
            
            get done() {
                return this[PL_W_CUR].length === 0;
            }
            
            walk() {
                while(!this.done) {
                    this.step();
                }
            }
            
            [MTD_W_ND_NEW](loop_varr) {
                let nd = new c_ss_node();
                let wcnt = nd.set_loops(loop_varr);
                return [nd, wcnt];
            }
            
            [MTD_W_ND_LEN](nd) {
                return nd.length;
            }
            
            *[MTD_W_ND_ITER](nd) {
                yield *nd.iter();
            }
            
        }
        
        class c_ss_walker_get extends c_ss_walker {
            
            constructor(start, vset) {
                super(start, [...vset]);
                this[MTD_W_INIT_STAT]();
            }
            
            [MTD_W_INIT_STAT]() {
                this[PL_W_STAT] = {
                    match: null,
                    cmplt: false,
                };
            }
            
            [MTD_W_RET](match, cmplt) {
                assert(this.done);
                let s = this[PL_W_STAT];
                s.match = match;
                s.cmplt = cmplt;
            }
            
            step() {
                let cseq = this[PL_W_CUR];
                let [nd, varr, pnd, pkv, wcnt] = cseq[0];
                if(varr.length === 0) {
                    cseq.shift();
                    this[MTD_W_RET](nd, true);
                    return;
                }
                let v = varr.pop();
                let nxt = nd.next(v);
                if(nxt === KEY_ND_LOOPBACK) {
                    cseq[0][4] ++;
                    return;
                } else if(nxt) {
                    cseq[0] = [nxt, varr, nd, v, wcnt + 1];
                } else {
                    cseq.shift();
                    this[MTD_W_RET](null, false);
                }
            }
            
        }
        
        class c_ss_walker_add extends c_ss_walker {
            
            constructor(start, vset) {
                super(start, new c_masked_arr([...vset]));
                this[PL_W_NDINFO] = new Map();
            }
            
            [MTD_W_STRIP_VARR](nd, varr) {
                let rvarr = varr.clone();
                let cnt_looped = 0,
                    cnt_hit = 0,
                    cnt_missed = 0;
                if(nd === KEY_ND_TOP) {
                    return [rvarr.empty(), varr.length, 0, 0];
                }
                for(let [v, co] of varr.coiter()) {
                    let nxt = nd.next(v);
                    if(nxt === KEY_ND_LOOPBACK) {
                        cnt_looped ++;
                        rvarr.merge(co);
                    } else if(nxt) {
                        cnt_hit ++;
                    } else {
                        cnt_missed ++;
                    }
                }
                return [rvarr, cnt_looped, cnt_hit, cnt_missed];
            }
            
            [MTD_W_PARSE_NODE_INFO](nd, varr, wcnt) {
                let ndinfo = {};
                let [strp_varr, cnt_looped, cnt_hit, cnt_missed] = this[MTD_W_STRIP_VARR](nd, varr);
                assert(strp_varr.length === cnt_hit + cnt_missed);
                let strp_wcnt = wcnt + cnt_looped;
                let nlen = nd === KEY_ND_TOP ? Infinity : this[MTD_W_ND_LEN](nd);
                assert(nlen >= strp_wcnt);
                assert(strp_wcnt > 0 || (strp_wcnt === 0 && nlen === 0));
                ndinfo.qless = (nlen > strp_wcnt);
                ndinfo.qmore = (cnt_hit + cnt_missed > 0);
                ndinfo.varr = strp_varr;
                ndinfo.wcnt = strp_wcnt;
                ndinfo.walked = false;
                return ndinfo;
            }
            
            [MTD_W_GET_NODE_INFO](nd, varr, wcnt) {
                let nds = this[PL_W_NDINFO];
                let ndinfo = nds.get(nd);
                if(!ndinfo) {
                    assert(varr);
                    ndinfo = this[MTD_W_PARSE_NODE_INFO](nd, varr, wcnt);
                    nds.set(nd, ndinfo);
                }
                return ndinfo;
            }
            
            [MTD_W_NEW_SUB_NODE](next_varr) {
                let wlk_varr = next_varr.clone().inverse();
                let [nd, wcnt] = this[MTD_W_ND_NEW](wlk_varr);
                let is_tar = (next_varr.length === 0);
                if(is_tar) {
                    nd.reg();
                }
                let ndinfo = {};
                ndinfo.qless = false;
                ndinfo.qmore = !is_tar;
                ndinfo.varr = next_varr
                ndinfo.wcnt = wcnt;
                ndinfo.walked = false;
                this[PL_W_NDINFO].set(nd, ndinfo);
                return nd;
            }
            
            [MTD_W_CLONE_SUB_KEY](par_nd, sub_nd) {
                for(let [v, nxt] of this[MTD_W_ND_ITER](par_nd)) {
                    if(sub_nd.next(v)) {
                        continue;
                    }
                    if(nxt === KEY_ND_LOOPBACK) {
                        sub_nd.set_next(v, par_nd);
                    } else {
                        sub_nd.set_next(v, nxt);
                    }
                }
            }
            
            [MTD_W_GET_SUB_NODE](par_ndinfo, par_nd, next_varr) {
                assert(!par_ndinfo.qmore === (next_varr.length === 0));
                let nd = par_ndinfo.sub;
                if(!nd) {
                    nd = this[MTD_W_NEW_SUB_NODE](next_varr);
                    if(par_nd !== KEY_ND_TOP) {
                        this[MTD_W_CLONE_SUB_KEY](par_nd, nd);
                    }
                    par_ndinfo.sub = nd;
                }
                return nd;
            }
            
            step() {
                let [nd, varr, pnd, pkv, wcnt] = this[PL_W_CUR].shift();
                let ndinfo = this[MTD_W_GET_NODE_INFO](nd, varr, wcnt);
                let strp_varr = ndinfo.varr;
                if(ndinfo.qless) {
                    let sub_nd = this[MTD_W_GET_SUB_NODE](ndinfo, nd, strp_varr);
                    let prv_ndinfo = this[MTD_W_GET_NODE_INFO](pnd, null, null);
                    let relink_nd = prv_ndinfo.sub ?? pnd;
                    relink_nd.set_next(pkv, sub_nd);
                    if(!ndinfo.qmore) {
                        // q < n
                        return;
                    }
                    //q ^ n
                } else {
                    if(!ndinfo.qmore) {
                        // q == n
                        assert(nd !== KEY_ND_TOP);
                        nd.reg();
                        return;
                    }
                    // q > n
                }
                if(ndinfo.walked) {
                    return;
                }
                ndinfo.walked = true;
                let strp_wcnt = ndinfo.wcnt;
                for(let [v, co] of strp_varr.coiter()) {
                    assert(nd !== KEY_ND_TOP);
                    let nxt = nd.next(v);
                    assert(nxt !== KEY_ND_LOOPBACK);
                    if(!nxt) {
                        nxt = KEY_ND_TOP;
                    }
                    this[PL_W_CUR].push([
                        nxt, co, nd, v, strp_wcnt + 1,
                    ]);
                }
            }
            
        }
        
        class c_ss_node_reverse extends c_ss_node {
            
            length_rvs(root) {
                return root.length_next - this.length;
            }
            
            next(v) {
                let nxt = super.next(v);
                if(nxt === KEY_ND_LOOPBACK) {
                    nxt = null;
                } else if(nxt === null) {
                    nxt = KEY_ND_LOOPBACK;
                }
                return nxt;
            }
            
            *iter_rvs(root) {
                for(let [v] of root.iter()) {
                    let nxt = this.next(v);
                    if(nxt) {
                        yield nxt;
                    }
                }
            }
            
            set_loops_rvs(root, vset) {
                let aset = new Set();
                for(let [v] of root.iter()) {
                    aset.add(v);
                }
                for(let v of vset) {
                    aset.remove(v);
                }
                return this.set_loops(aset);
            }
            
        }
        
        class c_ss_walker_add_reverse extends c_ss_walker_add {
            
            [MTD_W_ND_NEW](loop_varr) {
                let nd = new c_ss_node_reverse();
                let wcnt = nd.set_loops_rvs(this[PR_W_ROOT], loop_varr);
                return [nd, wcnt];
            }
            
            [MTD_W_ND_LEN](nd) {
                return nd.length_rvs(this[PR_W_ROOT]);
            }
            
            *[MTD_W_ND_ITER](nd) {
                yield *nd.iter_rvs(this[PR_W_ROOT]);
            }
            
            [MTD_W_PRE_WALK]() {
                if(this[PL_W_CUR].length === 0) return;
                let [start, varr] = this[PL_W_CUR].shift();
                this[PR_W_ROOT] = start;
                
                if(start.length_next <= 1 && !start.valid) {
                    
                } else {
                    
                }
                
                this[PL_W_CUR].push([
                    start, nvarr, null, null, 0,
                ]);
            }
            
            walk() {
                this[MTD_W_PRE_WALK]();
                super.walk();
            }
            
        }
        
        class c_ss_walker_repr extends c_ss_walker {
            
            constructor(start) {
                super(start, null);
                this[PL_W_NDINFO] = new Map();
                this[PR_W_NID] = 0;
                this[PR_W_REPR] = '';
            }
            
            write(s) {
                this[PR_W_REPR] += s;
            }
            
            newline() {
                this[PR_W_REPR] += '\n';
            }
            
            get repr() {
                return this[PR_W_REPR];
            }
            
            [MTD_W_PARSE_NODE_INFO](nd) {
                let loops = [];
                let nexts = [];
                for(let [v, nxt] of this[MTD_W_ND_ITER](nd)) {
                    if(nxt === KEY_ND_LOOPBACK) {
                        loops.push(v);
                    } else {
                        nexts.push([v, nxt]);
                    }
                }
                loops.sort();
                nexts.sort((a, b) => a[0].localeCompare(b[0]));
                return {
                    nid: this[PR_W_NID]++,
                    loops: loops,
                    nexts: nexts,
                    walked: false,
                };
            }
            
            [MTD_W_GET_NODE_INFO](nd) {
                let nds = this[PL_W_NDINFO];
                let ndinfo = nds.get(nd);
                if(!ndinfo) {
                    ndinfo = this[MTD_W_PARSE_NODE_INFO](nd);
                    nds.set(nd, ndinfo);
                }
                return ndinfo;
            }
            
            step() {
                let [nd, varr, pnd, pkv, wcnt, indents, isfirst, islast] = this[PL_W_CUR].pop();
                indents = indents ?? [0];
                isfirst = isfirst ?? true;
                islast = islast ?? true;
                let ndinfo = this[MTD_W_GET_NODE_INFO](nd);
                if(!isfirst) {
                    for(let idt of indents) {
                        if(idt > 0) {
                            this.write(' '.repeat(idt - 1));
                        }
                        this.write('|');
                    }
                }
                if(ndinfo.walked) {
                    let repr_nd = `-${pkv ?? ''}-(${ndinfo.nid})*`;
                    this.write(repr_nd);
                    this.write('\n');
                    return;
                }
                ndinfo.walked = true;
                let repr_nd =
                    `-${pkv ?? ''}-${nd.valid ? '!':''}[${ndinfo.loops.length ? ndinfo.loops : '@'}](${ndinfo.nid})`;
                if(ndinfo.nexts.length) {
                    repr_nd += '-+';
                }
                this.write(repr_nd);
                let nindents = indents.slice();
                if(islast) {
                    let l = nindents.length;
                    nindents[l - 1] += repr_nd.length;
                } else {
                    nindents.push(repr_nd.length);
                }
                let nlen = ndinfo.nexts.length;
                if(nlen === 0) {
                    this.write('\n');
                }
                for(let i = nlen - 1; i > -1; i--) {
                    let [v, nxt] = ndinfo.nexts[i];
                    this[PL_W_CUR].push([
                        nxt, null, nd, v, 0, nindents, i === 0, i === nlen - 1,
                    ]);
                }
            }
            
        }
        
        class c_ss_graph {
            
            constructor(orig = true, rvs = false) {
                let root;
                if(orig) {
                    this[PR_G_ROOT] = new c_ss_node();
                }
                if(rvs) {
                    this[PR_G_ROOT_RVS] = new c_ss_node_reverse();
                }
            }
            
            test_add_walker(vset) {
                return new c_ss_walker_add(this[PR_G_ROOT], vset);
            }
            
            test_add_rvs_walker(vset) {
                return new c_ss_walker_add_reverse(this[PR_G_ROOT_RVS], vset);
            }
            
            repr(rvs = false) {
                let root;
                if(rvs) {
                    root = this[PR_G_ROOT_RVS];
                } else {
                    root = this[PR_G_ROOT];
                }
                let wlkr = new c_ss_walker_repr(root);
                wlkr.walk();
                return wlkr.repr;
            }
            
        }
        
        return c_ss_graph;
        
    };
    
    const str_mapops = {
        new() {
            return {};
        },
        
        get(dmap, key) {
            return dmap[key];
        },
        
        set(dmap, key, val) {
            dmap[key] = val;
        },
        
        *iter(dmap) {
            yield *Object.entries(dmap);
        },
    };
    
    const obj_mapops = {
        new() {
            return new Map();
        },
        
        get(dmap, key) {
            return dmap.get(key);
        },
        
        set(dmap, key, val) {
            dmap.set(key, val);
        },
        
        *iter(dmap) {
            yield *dmap.entries();
        },
    };
    
    const test_sets = (sets) => {
        let fsslm = new (meta_fsslm(str_mapops))(true, true);
        let wlks = sets.map(s => fsslm.test_add_walker(s));
        let wlks_r = sets.map(s => fsslm.test_add_rvs_walker(s));
        return {
            fsslm,
            wlks, wlks_r,
            run(detail) {
                for(let i = 0; i < wlks.length; i++) {
                    let wlk = wlks[i];
                    let wlk_r = wlks_r[i];
                    let s = sets[i];
                    console.log('add', s);
                    wlk.walk();
                    if(detail) {
                        console.log(fsslm.repr(false));
                    }
                    console.log('rvs add', s);
                    wlk_r.walk();
                    if(detail) {
                        console.log(fsslm.repr(true));
                    }
                }
                console.log('done');
            },
        };
    }
    
    return {
        str: meta_fsslm(str_mapops),
        obj: meta_fsslm(obj_mapops),
        test1: test_sets.bind(null, [
            'abcde', 'abc', 'abcd', 'abde'
        ]),
        test2: test_sets.bind(null, [
            'abce', 'bcde', 'abcd',
        ]),
    };
    
})();
