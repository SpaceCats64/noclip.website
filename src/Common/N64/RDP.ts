import { assert } from "../../util";
import { fillVec4 } from "../../gfx/helpers/UniformBufferHelpers";

export const enum CCMUX {
    COMBINED    = 0,
    TEXEL0      = 1,
    TEXEL1      = 2,
    PRIMITIVE   = 3,
    SHADE       = 4,
    ENVIRONMENT = 5,
    ONE         = 6,
    ADD_ZERO    = 7,
    // param C only
    COMBINED_A  = 7, // only for C
    TEXEL0_A    = 8,
    TEXEL1_A    = 9,
    PRIMITIVE_A = 10,
    SHADE_A     = 11,
    ENV_A       = 12,
    PRIM_LOD    = 14,
    MUL_ZERO    = 15, // should really be 31
}

export const enum ACMUX {
    ADD_COMBINED = 0,
    TEXEL0 = 1,
    TEXEL1 = 2,
    PRIMITIVE = 3,
    SHADE = 4,
    ENVIRONMENT = 5,
    ADD_ONE = 6,
    ZERO = 7,
}

export interface ColorCombinePass {
    a: CCMUX;
    b: CCMUX;
    c: CCMUX;
    d: CCMUX;
}

export interface AlphaCombinePass {
    a: ACMUX;
    b: ACMUX;
    c: ACMUX;
    d: ACMUX;
}

export interface CombineParams {
    c0: ColorCombinePass;
    a0: AlphaCombinePass;
    c1: ColorCombinePass;
    a1: AlphaCombinePass;
}

export function decodeCombineParams(w0: number, w1: number): CombineParams {
    // because we aren't implementing all the combine input options (notably, not noise)
    // and the highest values are just 0, we can get away with throwing away high bits:
    // ax,bx,dx can be 3 bits, and cx can be 4
    const a0  = (w0 >>> 20) & 0x07;
    const c0  = (w0 >>> 15) & 0x0f;
    const Aa0 = (w0 >>> 12) & 0x07;
    const Ac0 = (w0 >>> 9) & 0x07;
    const a1  = (w0 >>> 5) & 0x07;
    const c1  = (w0 >>> 0) & 0x0f;
    const b0  = (w1 >>> 28) & 0x07;
    const b1  = (w1 >>> 24) & 0x07;
    const Aa1 = (w1 >>> 21) & 0x07;
    const Ac1 = (w1 >>> 18) & 0x07;
    const d0  = (w1 >>> 15) & 0x07;
    const Ab0 = (w1 >>> 12) & 0x07;
    const Ad0 = (w1 >>> 9) & 0x07;
    const d1  = (w1 >>> 6) & 0x07;
    const Ab1 = (w1 >>> 3) & 0x07;
    const Ad1 = (w1 >>> 0) & 0x07;

    // CCMUX.ONE only applies to params a and d, the others are not implemented
    assert(b0 != CCMUX.ONE && c0 != CCMUX.ONE && b1 != CCMUX.ONE && c1 != CCMUX.ONE);

    return {
        c0: { a: a0, b: b0, c: c0, d: d0 },
        a0: { a: Aa0, b: Ab0, c: Ac0, d: Ad0 },
        c1: { a: a1, b: b1, c: c1, d: d1 },
        a1: { a: Aa1, b: Ab1, c: Ac1, d: Ad1 }
    };
}

function packParams(params: ColorCombinePass | AlphaCombinePass): number {
    return (params.a << 12) | (params.b << 8) | (params.c << 4) | params.d;
}

export function fillCombineParams(d: Float32Array, offs: number, params: CombineParams): number {
    const cc0 = packParams(params.c0);
    const cc1 = packParams(params.c1);
    const ac0 = packParams(params.a0);
    const ac1 = packParams(params.a1);
    return fillVec4(d, offs, cc0, ac0, cc1, ac1);
}


function colorCombinePassUsesT1(ccp: ColorCombinePass) {
    return (ccp.a == CCMUX.TEXEL1) || (ccp.a == CCMUX.TEXEL1_A) ||
        (ccp.b == CCMUX.TEXEL1) || (ccp.b == CCMUX.TEXEL1_A) ||
        (ccp.c == CCMUX.TEXEL1) || (ccp.c == CCMUX.TEXEL1_A) ||
        (ccp.d == CCMUX.TEXEL1) || (ccp.d == CCMUX.TEXEL1_A);
}

function alphaCombinePassUsesT1(acp: AlphaCombinePass) {
    return (acp.a == ACMUX.TEXEL1 || acp.b == ACMUX.TEXEL1 || acp.c == ACMUX.TEXEL1 || acp.d == ACMUX.TEXEL1);
}

export function combineParamsUsesT1(cp: CombineParams) {
    return colorCombinePassUsesT1(cp.c0) || colorCombinePassUsesT1(cp.c1) ||
        alphaCombinePassUsesT1(cp.a0) || alphaCombinePassUsesT1(cp.a1);
}