const FSSLM = (()=> {
    
    const [
    
        PL_MA_SRC, PR_MA_MSK, PR_MA_LEN,
        MTD_MA_INT,
        
        PR_N_DVAL,
        FLG_N_VALID,
        
        PL_N_NXT, PR_N_LOOPCNT,
        
        PL_NR_NXT, PL_NR_CO,
        
        PL_W_CUR,
        MTD_W_ND_NEW, MTD_W_ND_LEN, MTD_W_ND_ITER,
        
        PL_W_STAT,
        MTD_W_INIT_STAT, MTD_W_RET,
        MTD_W_VOID,
        
        PL_W_NDINFO,
        PR_W_DSTND,
        MTD_W_STRIP_VARR,
        MTD_W_PARSE_NODE_INFO, MTD_W_GET_NODE_INFO,
        MTD_W_NEW_SUB_NODE, MTD_W_CLONE_SUB_KEY,
        MTD_W_GET_SUB_NODE, MTD_W_RELINK_SUB_NODE,
        
        PR_W_NID, PR_W_REPR,
        
        PL_W_NDWLK,
        MTD_W_TAKE_CTX, MTD_W_TRIM_CTX, MTD_W_PUT_CTX,
        MTD_W_CALC_DELT,
        MTD_W_ND_ITERNEXT,
        MTD_W_VFOUND, MTD_W_NXTCTX, MTD_W_SKIPNEXT,
        
        PR_W_ROOT,
        MTD_W_PRE_WALK,
        
        PR_W_QMORE,
        
        PL_N_PRV,
        
        PR_G_ROOT, PR_G_ROOT_RVS,
        
        PR_MPOP_SIZE,
        
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
        
        class c_ss_node_base {
            
            constructor() {
                this[FLG_N_VALID] = false;
            }
            
            get valid() {
                return this[FLG_N_VALID];
            }
            
            set(val) {
                this[PR_N_DVAL] = val;
            }
            
            get val() {
                return this[PR_N_DVAL] ?? null;
            }
            
            reg() {
                this[FLG_N_VALID] || (this[FLG_N_VALID] = true);
                return this;
            }
            
            unreg() {
                this[FLG_N_VALID] && (this[FLG_N_VALID] = false);
                this[PR_N_DVAL] === undefined || (this[PR_N_DVAL] = undefined);
                return this;
            }
            
        }
        
        class c_ss_node extends c_ss_node_base {
            
            constructor() {
                super();
                this[PL_N_NXT] = mapops.new();
                this[PR_N_LOOPCNT] = 0;
            }
            
            get length() {
                return this[PR_N_LOOPCNT];
            }
            
            get length_next() {
                return mapops.size(this[PL_N_NXT]) - this[PR_N_LOOPCNT];
            }
            
            next(v) {
                let nxt = mapops.get(this[PL_N_NXT], v);
                return nxt ?? null;
            }
            
            *iter() {
                yield *mapops.iter(this[PL_N_NXT]);
            }
            
            *iter_next() {
                for(let [v, nxt] of mapops.iter(this[PL_N_NXT])) {
                    if(nxt !== KEY_ND_LOOPBACK) {
                        yield nxt;
                    }
                }
            }
            
            *iter_set() {
                for(let [v, nxt] of mapops.iter(this[PL_N_NXT])) {
                    if(nxt === KEY_ND_LOOPBACK) {
                        yield v;
                    }
                }
            }
            
            set_next(v, nnd) {
                assert(nnd !== KEY_ND_LOOPBACK);
                mapops.set(this[PL_N_NXT], v, nnd);
            }
            
            set_loops(vset) {
                let cnt = 0;
                for(let v of vset) {
                    assert(!mapops.get(this[PL_N_NXT], v));
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
        
        const meta_ss_walker_match = c_ss_walker_base =>
            class c_ss_walker_match extends c_ss_walker_base {
                
                constructor(start, vset) {
                    super(start, [...vset]);
                    this[MTD_W_INIT_STAT]();
                }
                
                [MTD_W_INIT_STAT]() {
                    this[PL_W_STAT] = {
                        match: null,
                        cmplt: false,
                        vlen: this[PL_W_CUR][0][1].length,
                    };
                }
                
                [MTD_W_RET](match, dcnt) {
                    assert(this.done);
                    let s = this[PL_W_STAT];
                    s.match = match;
                    s.delt = dcnt;
                    s.cmplt = (dcnt === 0);
                    s.valid = match?.valid ?? false;
                }
                
                get result() {
                    return this.done ? this[PL_W_STAT] : null;
                }
                
                [MTD_W_VOID](v) {
                    this[PL_W_CUR].shift();
                    this[MTD_W_RET](null, Infinity);
                }
                
                step() {
                    let cseq = this[PL_W_CUR];
                    let [nd, varr, pnd, pkv, wcnt] = cseq[0];
                    if(varr.length === 0) {
                        let nlen = this[MTD_W_ND_LEN](nd);
                        assert(nlen >= wcnt);
                        cseq.shift();
                        this[MTD_W_RET](nd, nlen - wcnt);
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
                        this[MTD_W_VOID](v);
                    }
                }
                
            };
        const c_ss_walker_match = meta_ss_walker_match(c_ss_walker);
            
        const meta_ss_walker_add = c_ss_walker_base =>
            class c_ss_walker_add extends c_ss_walker_base {
                
                constructor(start, vset) {
                    super(start, new c_masked_arr([...vset]));
                    this[PL_W_NDINFO] = new Map();
                    this[PR_W_DSTND] = null;
                }
                
                get dest() {
                    assert(!this.done || this[PR_W_DSTND]);
                    return this[PR_W_DSTND];
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
                        assert(this[PR_W_DSTND] === null);
                        this[PR_W_DSTND] = nd;
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
                    if(par_nd === KEY_ND_TOP) {
                        return;
                    }
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
                        this[MTD_W_CLONE_SUB_KEY](par_nd, nd);
                        par_ndinfo.sub = nd;
                    }
                    return nd;
                }
                
                [MTD_W_RELINK_SUB_NODE](par_ndinfo, par_nd, prv_ndinfo, prv_nd, prv_kv, src_varr, strp_varr) {
                    let sub_nd = this[MTD_W_GET_SUB_NODE](par_ndinfo, par_nd, strp_varr);
                    let relink_nd = prv_ndinfo.sub ?? prv_nd;
                    relink_nd.set_next(prv_kv, sub_nd);
                    return [sub_nd, relink_nd];
                }
                
                step() {
                    let [nd, varr, pnd, pkv, wcnt] = this[PL_W_CUR].shift();
                    let ndinfo = this[MTD_W_GET_NODE_INFO](nd, varr, wcnt);
                    let strp_varr = ndinfo.varr;
                    if(ndinfo.qless) {
                        let prv_ndinfo = this[MTD_W_GET_NODE_INFO](pnd, null, null);
                        this[MTD_W_RELINK_SUB_NODE](ndinfo, nd, prv_ndinfo, pnd, pkv, varr, strp_varr);
                        if(!ndinfo.qmore) {
                            // q < n
                            ndinfo.walked = true;
                            return;
                        }
                        //q ^ n
                    } else {
                        if(!ndinfo.qmore) {
                            // q == n
                            assert(nd !== KEY_ND_TOP);
                            if(!ndinfo.walked) {
                                nd.reg();
                                assert(this[PR_W_DSTND] === null);
                                this[PR_W_DSTND] = nd;
                            }
                            assert(this[PR_W_DSTND] === nd);
                            ndinfo.walked = true;
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
                
            };
        const c_ss_walker_add = meta_ss_walker_add(c_ss_walker);
        
        const meta_ss_walker_repr = c_ss_walker_base =>
            class c_ss_walker_repr extends c_ss_walker_base {
                
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
                    nexts.sort((a, b) => a[0]?.localeCompare?.(b[0]) ?? a[0] - b[0]);
                    return {
                        nid: this[PR_W_NID]++,
                        loops: loops,
                        nexts: nexts,
                        repr: loops.length ? loops : '@',
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
                        `-${pkv ?? ''}-${nd.valid ? '!':''}[${ndinfo.repr}](${ndinfo.nid})`;
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
                
            };
        const c_ss_walker_repr = meta_ss_walker_repr(c_ss_walker);
        
        class c_ss_walker_nearest extends c_ss_walker {
            
            constructor(start) {
                super(null, null);
                this[PL_W_CUR] = [[[start, 0]]];
                this[PL_W_NDWLK] = new Set();
                this[MTD_W_INIT_STAT]()
            }
            
            [MTD_W_INIT_STAT]() {
                this[PL_W_STAT] = {
                    matches: [],
                    found: false,
                    delt: Infinity,
                };
            }
            
            [MTD_W_RET](match, delt) {
                let s = this[PL_W_STAT];
                if(match) {
                    s.matches.push(match);
                    s.found = true;
                }
                s.delt = delt;
            }
            
            get result() {
                return this[PL_W_STAT];
            }
            
            [MTD_W_TAKE_CTX]() {
                let ques = this[PL_W_CUR];
                assert(ques.length > 0);
                let que = ques[0];
                assert(que.length > 0);
                return que.pop();
            }
            
            [MTD_W_TRIM_CTX]() {
                let ques = this[PL_W_CUR];
                assert(ques.length > 0);
                let que = ques[0];
                if(que.length === 0) {
                    if(this[PL_W_STAT].found) {
                        this[PL_W_CUR] = [];
                    } else {
                        ques.shift();
                        if(ques.length > 0) {
                            while(!ques[0]) {
                                ques.shift();
                                assert(ques.length > 0);
                            }
                        }
                    }
                }
            }
            
            [MTD_W_PUT_CTX](ctx, dcnt) {
                let ques = this[PL_W_CUR];
                let que = ques[dcnt];
                if(!que) {
                    que = [];
                    ques[dcnt] = que;
                }
                que.push(ctx);
            }
            
            [MTD_W_CALC_DELT](cur, nxt) {
                return nxt.length - cur.length;
            }
            
            *[MTD_W_ND_ITERNEXT](nd) {
                yield *nd.iter_next();
            }
            
            [MTD_W_VFOUND](ctx) {
                return ctx[0].valid;
            }
            
            [MTD_W_NXTCTX](ctx, nxt, nxtcnt) {
                return [nxt, nxtcnt];
            }
            
            step() {
                let ctx = this[MTD_W_TAKE_CTX]();
                let [nd, wcnt] = ctx;
                if(this[MTD_W_VFOUND](ctx)) {
                    this[MTD_W_RET](nd, wcnt);
                }
                if(!this[MTD_W_SKIPNEXT]?.(nd)) {
                    for(let nxt of this[MTD_W_ND_ITERNEXT](nd)) {
                        assert(nxt && nxt !== KEY_ND_LOOPBACK);
                        if(this[PL_W_NDWLK].has(nxt)) continue;
                        let dcnt = this[MTD_W_CALC_DELT](nd, nxt);
                        assert(dcnt > 0);
                        this[MTD_W_PUT_CTX](this[MTD_W_NXTCTX](ctx, nxt, wcnt + dcnt), dcnt);
                        this[PL_W_NDWLK].add(nxt);
                    }
                }
                this[MTD_W_TRIM_CTX]();
            }
            
        };
        
        class c_ss_walker_nearest_reverse extends c_ss_walker_nearest {
            
            [MTD_W_CALC_DELT](cur, nxt) {
                return cur.length - nxt.length;
            }
            
        }
        
        class c_ss_node_reverse extends c_ss_node_base {
            
            constructor() {
                super();
                this[PL_NR_NXT] = mapops.new();
                this[PL_NR_CO] = new Set();
            }
            
            clone_noreg() {
                let r = new c_ss_node_reverse();
                for(let [v, nxt] of mapops.iter(this[PL_NR_NXT])) {
                    mapops.set(r[PL_NR_NXT], v, nxt);
                }
                for(let v of this[PL_NR_CO]) {
                    r[PL_NR_CO].add(v);
                }
                return r;
            }
            
            get length() {
                return this[PL_NR_CO].size;
            }
            
            get length_next() {
                return mapops.size(this[PL_NR_NXT]);
            }
            
            length_rvs(root) {
                return root.length - this.length;
            }
            
            next(v) {
                let nxt = mapops.get(this[PL_NR_NXT], v);
                if(!nxt) {
                    nxt = this[PL_NR_CO].has(v) ? null : KEY_ND_LOOPBACK;
                }
                return nxt;
            }
            
            *iter_next() {
                for(let [v, nxt] of mapops.iter(this[PL_NR_NXT])) {
                    yield nxt;
                }
            }
            
            *iter_set() {
                yield *this[PL_NR_CO];
            }
            
            *iter_rvs(root) {
                for(let v of root.iter_set()) {
                    let nxt = this.next(v);
                    if(nxt) {
                        yield [v, nxt];
                    }
                }
            }
            
            set_next(v, nnd) {
                assert(nnd !== KEY_ND_LOOPBACK);
                mapops.set(this[PL_NR_NXT], v, nnd);
            }
            
            set_co(v) {
                this[PL_NR_CO].add(v);
            }
            
            set_loops_rvs(root, vset) {
                let co = this[PL_NR_CO];
                for(let v of root.iter_set()) {
                    co.add(v);
                }
                let cnt = 0;
                for(let v of vset) {
                    co.delete(v);
                    cnt ++;
                }
                return cnt;
            }
            
        }
        
        class c_ss_walker_reverse extends c_ss_walker {
            
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
                this[PR_W_ROOT] = this[PL_W_CUR][0][0];
            }
            
            walk() {
                if(!this.done) {
                    this[MTD_W_PRE_WALK]();
                    super.walk();
                }
                return this[PR_W_ROOT];
            }
            
        }
        
        class c_ss_walker_match_reverse extends meta_ss_walker_match(c_ss_walker_reverse) {
            
            [MTD_W_PRE_WALK]() {
                let [start, varr] = this[PL_W_CUR].shift();
                let nvset = new Set();
                for(let v of start.iter_set()) {
                    nvset.add(v);
                }
                let qmore = 0;
                for(let v of varr) {
                    if(nvset.has(v)) {
                        nvset.delete(v);
                    } else {
                        qmore ++;
                    }
                }
                this[PR_W_QMORE] = qmore;
                this[PR_W_ROOT] = start;
                this[PL_W_CUR].push([
                    start, [...nvset], null, null, 0,
                ]);
            }
            
            [MTD_W_RET](match, dcnt) {
                super[MTD_W_RET](match, dcnt + this[PR_W_QMORE]);
            }
            
        }
            
        class c_ss_walker_add_reverse extends meta_ss_walker_add(c_ss_walker_reverse) {
            
            [MTD_W_PRE_WALK]() {
                let [start, varr] = this[PL_W_CUR].shift();
                let nvset = new Set();
                for(let v of start.iter_set()) {
                    nvset.add(v);
                }
                let nco = [];
                for(let v of varr) {
                    if(start.next(v) === KEY_ND_LOOPBACK) {
                        nco.push(v);
                    }
                    nvset.delete(v);
                }
                let root = start;
                if(nco.length > 0) {
                    if(start.length_next > 1 || start.valid) {
                        root = start.clone_noreg();
                    }
                    for(let v of nco) {
                        root.set_co(v);
                        if(root !== start) {
                            root.set_next(v, start);
                        }
                    }
                }
                this[PR_W_ROOT] = root;
                this[PL_W_CUR].push([
                    root, new c_masked_arr([...nvset]), null, null, 0,
                ]);
            }
            
        }
        
        class c_ss_walker_repr_reverse extends meta_ss_walker_repr(c_ss_walker_reverse) {
            
            [MTD_W_PARSE_NODE_INFO](nd) {
                let ndinfo = super[MTD_W_PARSE_NODE_INFO](nd);
                let nloops = [...nd.iter_set()].sort();
                ndinfo.loops = nloops;
                ndinfo.repr = nloops.length ? nloops : '@';
                return ndinfo
            }
            
        }
        
        class c_ss_node_duplex extends c_ss_node {
            
            constructor() {
                super();
                this[PL_N_PRV] = new Set();
            }
            
            *iter_prev() {
                yield *this[PL_N_PRV];
            }
            
            has_prev(pnd) {
                return this[PL_N_PRV].has(pnd);
            }
            
            set_prev(pnd) {
                this[PL_N_PRV].add(pnd);
            }
            
            remove_prev(pnd) {
                this[PL_N_PRV].delete(pnd);
            }
            
        };
        
        class c_ss_walker_add_duplex extends c_ss_walker_add {
            
            constructor(start, vset) {
                super(start, vset);
                this[PR_W_ROOT] = start;
            }
            
            [MTD_W_ND_NEW](loop_varr) {
                let nd = new c_ss_node_duplex();
                let wcnt = nd.set_loops(loop_varr);
                return [nd, wcnt];
            }
            
            [MTD_W_CLONE_SUB_KEY](par_nd, sub_nd) {
                super[MTD_W_CLONE_SUB_KEY](par_nd, sub_nd);
                assert(par_nd !== this[PR_W_ROOT]);
                if(par_nd === KEY_ND_TOP) {
                    par_nd = this[PR_W_ROOT];
                }
                par_nd.set_prev(sub_nd);
            }
            
            [MTD_W_RELINK_SUB_NODE](par_ndinfo, par_nd, prv_ndinfo, prv_nd, prv_kv, src_varr, strp_varr) {
                let r_pair = super[MTD_W_RELINK_SUB_NODE](
                    par_ndinfo, par_nd, prv_ndinfo, prv_nd, prv_kv, src_varr, strp_varr
                );
                let [sub_nd, relink_nd] = r_pair;
                assert(par_nd !== this[PR_W_ROOT]);
                if(par_nd === KEY_ND_TOP) {
                    this[PR_W_ROOT].remove_prev(relink_nd);
                } else {
                    par_nd.remove_prev(relink_nd);
                }
                if( sub_nd.has_prev(relink_nd)
                    || par_ndinfo.ud_link?.has?.(relink_nd) ) {
                    return r_pair;
                }
                let rm_varr = strp_varr.clone().inverse().merge(src_varr);
                let dir_link = true;
                for(let v of rm_varr) {
                    let pn_nd = prv_nd.next(v);
                    assert(pn_nd !== KEY_ND_LOOPBACK);
                    if(!pn_nd) {
                        pn_nd = KEY_ND_TOP;
                    }
                    if(pn_nd !== par_nd && pn_nd !== sub_nd) {
                        dir_link = false;
                        break;
                    }
                }
                if(dir_link) {
                    sub_nd.set_prev(relink_nd);
                } else {
                    let udlk = par_ndinfo.ud_link;
                    if(!udlk) {
                        udlk = new Set();
                        par_ndinfo.ud_link = udlk;
                    }
                    udlk.add(relink_nd);
                }
                return r_pair;
            }
            
        }
        
        class c_ss_walker_repr_duplex_reverse extends c_ss_walker_repr {
            
            [MTD_W_PARSE_NODE_INFO](nd) {
                let ndinfo = super[MTD_W_PARSE_NODE_INFO](nd);
                let nnexts = [];
                for(let nxt of nd.iter_prev()) {
                    nnexts.push([null, nxt]);
                }
                ndinfo.nexts = nnexts;
                return ndinfo
            }
            
        }
        
        class c_ss_walker_match_duplex_reverse extends c_ss_walker_match {
            
            constructor(start, vset) {
                super(start, vset);
                this[PR_W_QMORE] = 0;
                this[PR_W_ROOT] = start;
            }
            
            [MTD_W_RET](match, dcnt) {
                let qmore = this[PR_W_QMORE];
                super[MTD_W_RET](match, qmore - dcnt);
                if(qmore > 0) {
                    this[PL_W_STAT].cmplt = false;
                }
            }
            
            [MTD_W_VOID](v) {
                let rn = this[PR_W_ROOT].next(v);
                if(rn) {
                    assert(rn !== KEY_ND_LOOPBACK);
                    super[MTD_W_VOID](v);
                } else {
                    this[PR_W_QMORE] ++;
                }
            }
            
        }
        
        class c_ss_walker_nearest_duplex_reverse extends c_ss_walker_nearest_reverse {
            
            constructor(start, root, vset) {
                super(start);
                this[PL_W_CUR][0][0].push(new Set(vset));
                this[PR_W_ROOT] = root;
            }
            
            [MTD_W_PRE_WALK]() {
                let ctx = this[PL_W_CUR][0][0];
                let [start, wcnt, vset] = ctx;
                let co_varr = [];
                let st_iter;
                let from_root = !start;
                if(from_root) {
                    st_iter = this[PR_W_ROOT].iter();
                } else {
                    st_iter = start.iter_set();
                }
                let start_cnt = 0;
                for(let itm of st_iter) {
                    let v;
                    if(from_root) {
                        assert(itm[1] !== KEY_ND_LOOPBACK);
                        v = itm[0];
                    } else {
                        v = itm;
                    }
                    start_cnt ++;
                    if(!vset.has(v)) {
                        co_varr.push(v);
                    }
                }
                ctx[1] += vset.size - start_cnt;
                this[PL_W_STAT].delt = vset.size;
                ctx[2] = new c_masked_arr(co_varr);
            }
            
            *[MTD_W_ND_ITERNEXT](nd) {
                if(!nd) {
                    nd = this[PR_W_ROOT];
                }
                yield *nd.iter_prev();
            }
            
            [MTD_W_VFOUND](ctx) {
                let [nd, wcnt, co_varr] = ctx;
                if(!nd) {
                    return false;
                }
                let match;
                let covlen = co_varr.length;
                if(covlen > 0) {
                    let rvarr = co_varr.clone();
                    let trim_cnt = 0;
                    for(let [v, co] of co_varr.coiter()) {
                        let nxt = nd.next(v);
                        if(nxt !== KEY_ND_LOOPBACK) {
                            rvarr.merge(co);
                            trim_cnt ++;
                        }
                    }
                    assert(trim_cnt <= covlen);
                    if(trim_cnt > 0) {
                        // mod context here
                        ctx[2] = rvarr;
                    }
                    match = (trim_cnt === covlen);
                } else {
                    match = true;
                }
                assert(!match || (wcnt >= 0));
                return match && nd.valid;
            }
            
            [MTD_W_NXTCTX](ctx, nxt, nxtcnt) {
                return [nxt, nxtcnt, ctx[2]];
            }
            
            [MTD_W_SKIPNEXT](nd) {
                return nd === this[PR_W_ROOT];
            }
            
            [MTD_W_CALC_DELT](cur, nxt) {
                let clen;
                if(cur) {
                    clen = cur.length
                } else {
                    clen = this[PR_W_ROOT].length_next;
                }
                return clen - nxt.length;
            }
            
            walk() {
                if(!this.done) {
                    this[MTD_W_PRE_WALK]();
                    super.walk();
                }
            }
            
        }
        
        class c_ss_graph {
            
            constructor(orig = true, rvs = true) {
                let root;
                if(orig) {
                    this[PR_G_ROOT] = new c_ss_node();
                }
                if(rvs) {
                    this[PR_G_ROOT_RVS] = new c_ss_node_reverse();
                }
            }
            
            set(vset, dval) {
                let root = this[PR_G_ROOT];
                if(root) {
                    let wlkr = new c_ss_walker_add(root, vset);
                    wlkr.walk();
                    let dst = wlkr.dest;
                    dst.set(dval);
                }
                root = this[PR_G_ROOT_RVS];
                if(root) {
                    let wlkr = new c_ss_walker_add_reverse(root, vset);
                    this[PR_G_ROOT_RVS] = wlkr.walk();
                    let dst = wlkr.dest;
                    dst.set(dval);
                }
            }
            
            match(vset, rvs = null, get_nodes = false) {
                let wlkr, root, c_wlkr_nearest;
                let rinfo = {
                    matches: [],
                    unmatch: Infinity,
                    found: false,
                };
                if(get_nodes) {
                    rinfo.nodes = [];
                }
                if((root = this[PR_G_ROOT]) && !rvs) {
                    wlkr = new c_ss_walker_match(root, vset);
                    c_wlkr_nearest = c_ss_walker_nearest;
                } else if((root = this[PR_G_ROOT_RVS]) && (rvs ?? true)) {
                    wlkr = new c_ss_walker_match_reverse(root, vset);
                    c_wlkr_nearest = c_ss_walker_nearest_reverse;
                } else {
                    return rinfo;
                }
                wlkr.walk();
                let rslt = wlkr.result;
                let rmatch = rslt.match;
                rinfo.unmatch = rslt.delt;
                if(!rmatch) {
                    /* pass */
                } else if(rslt.valid) {
                    if(get_nodes) {
                        rinfo.nodes.push(rmatch);
                    }
                    rinfo.matches.push(rmatch.val);
                    rinfo.found = true;
                } else {
                    wlkr = new c_wlkr_nearest(rmatch);
                    wlkr.walk();
                    let rslt_nrst = wlkr.result;
                    for(let nd of rslt_nrst.matches) {
                        if(get_nodes) {
                            rinfo.nodes.push(nd);
                        }
                        rinfo.matches.push(nd.val);
                    }
                    rinfo.unmatch += rslt_nrst.delt;
                    rinfo.found = rslt_nrst.found;
                }
                if(rvs && rinfo.unmatch === Infinity) {
                    rinfo.unmatch = rslt.vlen;
                }
                return rinfo;
            }
            
            remove(vset) {
                let removed = false;
                for(let rvs of [false, true]) {
                    let minfo = this.match(vset, rvs, true);
                    if(minfo.unmatch === 0) {
                        assert(minfo.found && minfo.nodes.length === 1);
                        minfo.nodes[0].unreg();
                        removed = true;
                    }
                }
                return removed;
            }
            
            repr(rvs = null) {
                let wlkr, root;
                if((root = this[PR_G_ROOT]) && !rvs) {
                    wlkr = new c_ss_walker_repr(root);
                } else if((root = this[PR_G_ROOT_RVS]) && (rvs ?? true)) {
                    wlkr = new c_ss_walker_repr_reverse(root);
                } else {
                    return '';
                }
                wlkr.walk();
                return wlkr.repr;
            }
            
        }
        
        class c_ss_graph_duplex {
            
            constructor() {
                this[PR_G_ROOT] = new c_ss_node_duplex();
            }
            
            set(vset, dval) {
                let wlkr = new c_ss_walker_add_duplex(this[PR_G_ROOT], vset);
                wlkr.walk();
                let dst = wlkr.dest;
                dst.set(dval);
            }
            
            match(vset, rvs = false, get_nodes = false) {
                let rinfo = {
                    matches: [],
                    unmatch: Infinity,
                    found: false,
                };
                if(get_nodes) {
                    rinfo.nodes = [];
                }
                let c_wlkr;
                if(rvs) {
                    c_wlkr = c_ss_walker_match_duplex_reverse;
                } else {
                    c_wlkr = c_ss_walker_match;
                }
                let wlkr = new c_wlkr(this[PR_G_ROOT], vset);
                wlkr.walk();
                let rslt = wlkr.result;
                let rmatch = rslt.match;
                rinfo.unmatch = rslt.delt;
                if((!rvs || rslt.cmplt) && rslt.valid) {
                    assert(rmatch);
                    if(get_nodes) {
                        rinfo.nodes.push(rmatch);
                    }
                    rinfo.matches.push(rmatch.val);
                    rinfo.found = true;
                } else if( (!rvs && !rmatch) || (rvs && rmatch === this[PR_G_ROOT])) {
                    /* pass */
                } else {
                    if(rvs) {
                        wlkr = new c_ss_walker_nearest_duplex_reverse(rmatch, this[PR_G_ROOT], vset);
                    } else {
                        wlkr = new c_ss_walker_nearest(rmatch);
                    }
                    wlkr.walk();
                    let rslt_nrst = wlkr.result;
                    for(let nd of rslt_nrst.matches) {
                        if(get_nodes) {
                            rinfo.nodes.push(nd);
                        }
                        rinfo.matches.push(nd.val);
                    }
                    if(rvs) {
                        rinfo.unmatch = rslt_nrst.delt;
                    } else {
                        rinfo.unmatch += rslt_nrst.delt;
                    }
                    assert(rinfo.unmatch >= 0);
                    rinfo.found = rslt_nrst.found;
                }
                return rinfo;
            }
            
            remove(vset) {
                let minfo = this.match(vset, false, true);
                if(minfo.unmatch === 0) {
                    assert(minfo.found && minfo.nodes.length === 1);
                    minfo.nodes[0].unreg();
                    return true;
                }
                return false;
            }
            
            repr(rvs = false) {
                let wlkr = new c_ss_walker_repr(this[PR_G_ROOT]);
                if(rvs) {
                    wlkr = new c_ss_walker_repr_duplex_reverse(this[PR_G_ROOT]);
                } else {
                    wlkr = new c_ss_walker_repr(this[PR_G_ROOT]);
                }
                wlkr.walk();
                return wlkr.repr;
            }
            
        }
        
        return c_ss_graph_duplex;
        
    };
    
    const str_mapops = {
        new() {
            return {[PR_MPOP_SIZE]: 0};
        },
        
        size(dmap) {
            return dmap[PR_MPOP_SIZE];
        },
        
        get(dmap, key) {
            return dmap[key];
        },
        
        set(dmap, key, val) {
            if(!(key in dmap)) {
                dmap[PR_MPOP_SIZE] ++;
            }
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
        
        size(dmap) {
            return dmap.size;
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
        return {
            fsslm,
            run(detail) {
                for(let s of sets) {
                    fsslm.set(s, s);
                    console.log('add', s);
                    if(detail) {
                        console.log(fsslm.repr(false));
                    }
                    console.log('rvs add', s);
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
        test3: test_sets.bind(null, [
            'a', 'b', 'c', 'd', 'ab',
        ]),
    };
    
})();
