import type { AvatarVariantLibrary } from './types';
import type { AvatarPart } from './types';

export const SEED_VARIANTS: AvatarVariantLibrary = {
  hair: [
    {
      variantId: 'hair_flatcap',
      label: 'flat cap',
      elements: [
        { id: 'el_1',  type: 'box', position: [0, 2.78,   0],    scale: [0.54, 0.28, 0.36], rotation: [0, 0, 0] },
        { id: 'el_2',  type: 'box', position: [0, 2.963,  0.02], scale: [0.15, 0.19, 0.15], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'hair_afro',
      label: 'afro',
      elements: [
        { id: 'el_3',  type: 'sphere', position: [0, 2.46, 0], scale: [0.78, 0.68, 0.72], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'hair_bob',
      label: 'bob',
      elements: [
        { id: 'el_4',  type: 'box', position: [0,     2.32, 0], scale: [0.68, 0.18, 0.58], rotation: [0, 0, 0] },
        { id: 'el_5',  type: 'box', position: [-0.31, 2.16, 0], scale: [0.1,  0.26, 0.54], rotation: [0, 0, 0] },
        { id: 'el_6',  type: 'box', position: [0.31,  2.16, 0], scale: [0.1,  0.26, 0.54], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'hair_mohawk',
      label: 'mohawk',
      elements: [
        { id: 'el_7',  type: 'box', position: [0, 2.54, 0], scale: [0.14, 0.42, 0.52], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'hair_ponytail',
      label: 'ponytail',
      elements: [
        { id: 'el_8',  type: 'box', position: [0, 2.32,  0],     scale: [0.62, 0.18, 0.54], rotation: [0, 0, 0] },
        { id: 'el_9',  type: 'box', position: [0, 2.26,  -0.3],  scale: [0.14, 0.06, 0.14], rotation: [0, 0, 0] },
        { id: 'el_10', type: 'box', position: [0, 2.08,  -0.34], scale: [0.14, 0.32, 0.16], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'hair_pigtails',
      label: 'pigtails',
      elements: [
        { id: 'el_11', type: 'box', position: [0,     2.32, 0],    scale: [0.62, 0.18, 0.54], rotation: [0, 0, 0] },
        { id: 'el_12', type: 'box', position: [-0.36, 2.08, -0.1], scale: [0.1,  0.32, 0.1],  rotation: [0, 0, 0] },
        { id: 'el_13', type: 'box', position: [0.36,  2.08, -0.1], scale: [0.1,  0.32, 0.1],  rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'hair_bun',
      label: 'top bun',
      elements: [
        { id: 'el_14', type: 'box',    position: [0, 2.32, 0], scale: [0.62, 0.16, 0.54], rotation: [0, 0, 0] },
        { id: 'el_15', type: 'sphere', position: [0, 2.5,  0], scale: [0.32, 0.28, 0.3],  rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'hair_none',
      label: 'bald',
      elements: [],
    },
  ],

  head: [
    {
      variantId: 'head_standard',
      label: 'standard',
      elements: [
        { id: 'el_16', type: 'box', position: [0, 2.64, 0.04], scale: [0.38, 0.32, 0.3], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'head_round',
      label: 'round',
      elements: [
        { id: 'el_17', type: 'sphere', position: [0, 1.96, 0], scale: [0.62, 0.62, 0.56], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'head_big',
      label: 'big head',
      elements: [
        { id: 'el_18', type: 'box', position: [0, 1.98, 0], scale: [0.76, 0.74, 0.68], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'head_small',
      label: 'small head',
      elements: [
        { id: 'el_19', type: 'box', position: [0, 1.92, 0], scale: [0.44, 0.44, 0.4], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'head_cube',
      label: 'cube head',
      elements: [
        { id: 'el_20', type: 'box', position: [0, 1.95, 0], scale: [0.6, 0.6, 0.6], rotation: [0, 0, 0] },
      ],
    },
  ],

  face: [
    {
      variantId: 'face_blank',
      label: 'blank',
      elements: [],
    },
    {
      variantId: 'face_neutral',
      label: 'neutral',
      elements: [
        { id: 'el_23',             type: 'box', position: [0,      2.54,  0.173], scale: [0.22, 0.03, 0.04], rotation: [0, 0, 0] },
        { id: 'el_1778043321033',  type: 'box', position: [-0.121, 2.666, 0.17],  scale: [0.06, 0.06, 0.06], rotation: [0, 0, 0], pairedWith: 'el_1778043321034', color: '#ffffff' },
        { id: 'el_1778043321034',  type: 'box', position: [0.121,  2.666, 0.17],  scale: [0.06, 0.06, 0.06], rotation: [0, 0, 0], pairedWith: 'el_1778043321033', color: '#ffffff' },
        { id: 'el_1778043321035',  type: 'box', position: [-0.119, 2.663, 0.21],  scale: [0.01, 0.01, 0.01], rotation: [0, 0, 0], pairedWith: 'el_1778043321036' },
        { id: 'el_1778043321036',  type: 'box', position: [0.119,  2.663, 0.21],  scale: [0.01, 0.01, 0.01], rotation: [0, 0, 0], pairedWith: 'el_1778043321035' },
      ],
    },
    {
      variantId: 'face_happy',
      label: 'happy',
      elements: [
        { id: 'el_24', type: 'box', position: [-0.12, 2.02,  0.28], scale: [0.12, 0.06, 0.04], rotation: [0, 0, 0], color: '#ffffff' },
        { id: 'el_25', type: 'box', position: [0.12,  2.02,  0.28], scale: [0.12, 0.06, 0.04], rotation: [0, 0, 0], color: '#ffffff' },
        { id: 'el_26', type: 'box', position: [0,     1.83,  0.28], scale: [0.14, 0.06, 0.04], rotation: [0, 0, 0] },
        { id: 'el_27', type: 'box', position: [-0.1,  1.855, 0.28], scale: [0.06, 0.06, 0.04], rotation: [0, 0, -0.45] },
        { id: 'el_28', type: 'box', position: [0.1,   1.855, 0.28], scale: [0.06, 0.06, 0.04], rotation: [0, 0,  0.45] },
      ],
    },
    {
      variantId: 'face_sunglasses',
      label: 'sunglasses',
      elements: [
        { id: 'el_29', type: 'box', position: [-0.12, 2.02, 0.3],  scale: [0.17, 0.12, 0.03], rotation: [0, 0, 0] },
        { id: 'el_30', type: 'box', position: [0.12,  2.02, 0.3],  scale: [0.17, 0.12, 0.03], rotation: [0, 0, 0] },
        { id: 'el_31', type: 'box', position: [0,     2.02, 0.29], scale: [0.04, 0.04, 0.02], rotation: [0, 0, 0] },
        { id: 'el_32', type: 'box', position: [0,     1.84, 0.28], scale: [0.22, 0.07, 0.04], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'face_squareglasses',
      label: 'square glasses',
      elements: [
        { id: 'el_33', type: 'box', position: [-0.12, 2.02, 0.28], scale: [0.1,  0.1,  0.04], rotation: [0, 0, 0], color: '#ffffff' },
        { id: 'el_34', type: 'box', position: [0.12,  2.02, 0.28], scale: [0.1,  0.1,  0.04], rotation: [0, 0, 0], color: '#ffffff' },
        { id: 'el_35', type: 'box', position: [-0.12, 2.02, 0.3],  scale: [0.17, 0.15, 0.02], rotation: [0, 0, 0] },
        { id: 'el_36', type: 'box', position: [0.12,  2.02, 0.3],  scale: [0.17, 0.15, 0.02], rotation: [0, 0, 0] },
        { id: 'el_37', type: 'box', position: [0,     2.02, 0.29], scale: [0.04, 0.04, 0.02], rotation: [0, 0, 0] },
        { id: 'el_38', type: 'box', position: [0,     1.84, 0.28], scale: [0.22, 0.07, 0.04], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'face_mask',
      label: 'mask',
      elements: [
        { id: 'el_39', type: 'box', position: [-0.12, 2.02, 0.28], scale: [0.1,  0.1,  0.04], rotation: [0, 0, 0], color: '#ffffff' },
        { id: 'el_40', type: 'box', position: [0.12,  2.02, 0.28], scale: [0.1,  0.1,  0.04], rotation: [0, 0, 0], color: '#ffffff' },
        { id: 'el_41', type: 'box', position: [0,     1.86, 0.29], scale: [0.42, 0.22, 0.05], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'face_visor',
      label: 'visor',
      elements: [
        { id: 'el_42', type: 'box', position: [-0.12, 2.02, 0.28], scale: [0.1,  0.1,  0.04], rotation: [0, 0, 0], color: '#ffffff' },
        { id: 'el_43', type: 'box', position: [0.12,  2.02, 0.28], scale: [0.1,  0.1,  0.04], rotation: [0, 0, 0], color: '#ffffff' },
        { id: 'el_44', type: 'box', position: [0,     1.84, 0.28], scale: [0.22, 0.07, 0.04], rotation: [0, 0, 0] },
        { id: 'el_45', type: 'box', position: [0,     2.12, 0.3],  scale: [0.64, 0.07, 0.18], rotation: [0, 0, 0] },
      ],
    },
  ],

  neck: [
    {
      variantId: 'neck_standard',
      label: 'standard',
      elements: [
        { id: 'el_46', type: 'box', position: [0, 2.37, 0], scale: [0.14, 0.22, 0.14], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'neck_long',
      label: 'long',
      elements: [
        { id: 'el_47', type: 'cylinder', position: [0, 1.6, 0], scale: [0.2, 0.34, 0.2], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'neck_short',
      label: 'short',
      elements: [
        { id: 'el_48', type: 'cylinder', position: [0, 1.68, 0], scale: [0.2, 0.12, 0.2], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'neck_thick',
      label: 'thick',
      elements: [
        { id: 'el_49', type: 'box', position: [0, 1.66, 0], scale: [0.32, 0.22, 0.28], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'neck_slim',
      label: 'slim',
      elements: [
        { id: 'el_50', type: 'cylinder', position: [0, 1.66, 0], scale: [0.14, 0.22, 0.16], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'neck_none',
      label: 'none',
      elements: [],
    },
  ],

  arms: [
    {
      variantId: 'arms_tpose',
      label: 'T-pose',
      elements: [
        { id: 'el_51', type: 'box', position: [-0.69, 2.233, 0], scale: [0.1, 1.01, 0.09], rotation: [0, 0,  1.5684073464] },
        { id: 'el_52', type: 'box', position: [0.69,  2.233, 0], scale: [0.1, 1.01, 0.09], rotation: [0, 0, -1.5684073464] },
      ],
    },
    {
      variantId: 'arms_down30',
      label: 'relaxed down',
      elements: [
        { id: 'el_53', type: 'box', position: [-0.49, 1.14, 0], scale: [0.22, 0.6, 0.28], rotation: [0, 0,  0.5] },
        { id: 'el_54', type: 'box', position: [0.49,  1.14, 0], scale: [0.22, 0.6, 0.28], rotation: [0, 0, -0.5] },
      ],
    },
    {
      variantId: 'arms_raised',
      label: 'raised',
      elements: [
        { id: 'el_55', type: 'box', position: [-0.49, 1.52, 0], scale: [0.22, 0.6, 0.28], rotation: [0, 0, -0.5] },
        { id: 'el_56', type: 'box', position: [0.49,  1.52, 0], scale: [0.22, 0.6, 0.28], rotation: [0, 0,  0.5] },
      ],
    },
    {
      variantId: 'arms_bent',
      label: 'bent elbows',
      elements: [
        { id: 'el_57', type: 'box', position: [-0.44, 1.46, 0], scale: [0.22, 0.36, 0.26], rotation: [0, 0,  0.35] },
        { id: 'el_58', type: 'box', position: [0.44,  1.46, 0], scale: [0.22, 0.36, 0.26], rotation: [0, 0, -0.35] },
        { id: 'el_59', type: 'box', position: [-0.64, 1.2,  0], scale: [0.22, 0.36, 0.26], rotation: [0, 0, -0.9] },
        { id: 'el_60', type: 'box', position: [0.64,  1.2,  0], scale: [0.22, 0.36, 0.26], rotation: [0, 0,  0.9] },
      ],
    },
    {
      variantId: 'arms_crossed',
      label: 'crossed',
      elements: [
        { id: 'el_61', type: 'box', position: [-0.22, 1.28, 0.08], scale: [0.58, 0.2, 0.22], rotation: [0, 0,  0.15] },
        { id: 'el_62', type: 'box', position: [0.22,  1.34, 0.08], scale: [0.58, 0.2, 0.22], rotation: [0, 0, -0.15] },
      ],
    },
    {
      variantId: 'arms_victory',
      label: 'victory V',
      elements: [
        { id: 'el_63', type: 'box', position: [-0.52, 1.56, 0], scale: [0.22, 0.6, 0.28], rotation: [0, 0, -0.7] },
        { id: 'el_64', type: 'box', position: [0.52,  1.56, 0], scale: [0.22, 0.6, 0.28], rotation: [0, 0,  0.7] },
      ],
    },
  ],

  body: [
    {
      variantId: 'body_standard',
      label: 'standard',
      elements: [
        { id: 'el_65',             type: 'box', position: [0,      1.94, 0],  scale: [0.43, 0.72, 0.23], rotation: [0, 0, 0] },
        { id: 'el_1777778775026',  type: 'box', position: [0,      2.11, 0],  scale: [0.23, 0.5,  0.16], rotation: [0, 0, 0] },
        { id: 'el_1777845466277',  type: 'box', position: [-0.606, 2.23, 0],  scale: [0.82, 0.14, 0.13], rotation: [0, 0, 0], pairedWith: 'el_1777845466278' },
        { id: 'el_1777845466278',  type: 'box', position: [0.606,  2.23, 0],  scale: [0.82, 0.14, 0.13], rotation: [0, 0, 0], pairedWith: 'el_1777845466277' },
      ],
    },
    {
      variantId: 'body_wide',
      label: 'wide',
      elements: [
        { id: 'el_66', type: 'box', position: [0, 1.3, 0], scale: [0.88, 0.7, 0.42], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'body_slim',
      label: 'slim',
      elements: [
        { id: 'el_67', type: 'box', position: [0, 1.3, 0], scale: [0.56, 0.7, 0.32], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'body_jacket',
      label: 'jacket',
      elements: [
        { id: 'el_68', type: 'box', position: [0,     1.3,  0],    scale: [0.7,  0.7,  0.38], rotation: [0, 0, 0] },
        { id: 'el_69', type: 'box', position: [-0.19, 1.46, 0.2],  scale: [0.13, 0.3,  0.06], rotation: [0, 0, 0] },
        { id: 'el_70', type: 'box', position: [0.19,  1.46, 0.2],  scale: [0.13, 0.3,  0.06], rotation: [0, 0, 0] },
        { id: 'el_71', type: 'box', position: [0,     1.18, 0.2],  scale: [0.06, 0.26, 0.06], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'body_dress_top',
      label: 'dress top',
      elements: [
        { id: 'el_72', type: 'box', position: [0, 1.3,  0], scale: [0.64, 0.7,  0.36], rotation: [0, 0, 0] },
        { id: 'el_73', type: 'box', position: [0, 0.96, 0], scale: [0.7,  0.12, 0.4],  rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'body_crop',
      label: 'crop top',
      elements: [
        { id: 'el_74', type: 'box', position: [0, 1.38, 0], scale: [0.7, 0.5, 0.38], rotation: [0, 0, 0] },
      ],
    },
  ],

  pants: [
    {
      variantId: 'pants_standard',
      label: 'pants',
      elements: [
        { id: 'el_75',            type: 'box', position: [0,      1.47,  0], scale: [0.43, 0.22, 0.23], rotation: [0, 0, 0] },
        { id: 'el_1777845466275', type: 'box', position: [-0.119, 0.816, 0], scale: [0.19, 1.15, 0.23], rotation: [0, 0, 0], pairedWith: 'el_1777845466276' },
        { id: 'el_1777845466276', type: 'box', position: [0.119,  0.816, 0], scale: [0.19, 1.15, 0.23], rotation: [0, 0, 0], pairedWith: 'el_1777845466275' },
      ],
    },
    {
      variantId: 'pants_skirt',
      label: 'skirt',
      elements: [
        { id: 'el_76', type: 'box', position: [0, 0.64, 0], scale: [0.82, 0.54, 0.54], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'pants_miniskirt',
      label: 'mini skirt',
      elements: [
        { id: 'el_77', type: 'box', position: [0, 0.82, 0], scale: [0.76, 0.28, 0.5], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'pants_dress',
      label: 'full dress',
      elements: [
        { id: 'el_78', type: 'box', position: [0, 0.88, 0], scale: [0.56, 0.22, 0.34], rotation: [0, 0, 0] },
        { id: 'el_79', type: 'box', position: [0, 0.56, 0], scale: [0.88, 0.58, 0.58], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'pants_shorts',
      label: 'shorts',
      elements: [
        { id: 'el_80', type: 'box', position: [0, 0.9, 0], scale: [0.48, 0.14, 0.28], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'pants_overalls',
      label: 'overalls',
      elements: [
        { id: 'el_81', type: 'box', position: [0,     0.88, 0],    scale: [0.52, 0.22, 0.3],  rotation: [0, 0, 0] },
        { id: 'el_82', type: 'box', position: [-0.14, 1.32, 0.19], scale: [0.1,  0.5,  0.04], rotation: [0, 0, 0] },
        { id: 'el_83', type: 'box', position: [0.14,  1.32, 0.19], scale: [0.1,  0.5,  0.04], rotation: [0, 0, 0] },
        { id: 'el_84', type: 'box', position: [0,     1.46, 0.2],  scale: [0.3,  0.2,  0.04], rotation: [0, 0, 0] },
      ],
    },
  ],

  legs: [
    {
      variantId: 'legs_standard',
      label: 'standard',
      elements: [
        { id: 'el_85', type: 'box', position: [-0.12, 0.79, -0.002], scale: [0.12, 1.52, 0.15], rotation: [0, 0, 0] },
        { id: 'el_86', type: 'box', position: [0.12,  0.79, -0.002], scale: [0.12, 1.52, 0.15], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'legs_wide',
      label: 'wide',
      elements: [
        { id: 'el_87', type: 'box', position: [-0.18, 0.55, 0], scale: [0.28, 0.65, 0.3], rotation: [0, 0, 0] },
        { id: 'el_88', type: 'box', position: [0.18,  0.55, 0], scale: [0.28, 0.65, 0.3], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'legs_shorts',
      label: 'short legs',
      elements: [
        { id: 'el_89', type: 'box', position: [-0.18, 0.73, 0], scale: [0.22, 0.28, 0.28], rotation: [0, 0, 0] },
        { id: 'el_90', type: 'box', position: [0.18,  0.73, 0], scale: [0.22, 0.28, 0.28], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'legs_rolled',
      label: 'rolled up',
      elements: [
        { id: 'el_91', type: 'box', position: [-0.18, 0.58, 0], scale: [0.22, 0.6,  0.28], rotation: [0, 0, 0] },
        { id: 'el_92', type: 'box', position: [0.18,  0.58, 0], scale: [0.22, 0.6,  0.28], rotation: [0, 0, 0] },
        { id: 'el_93', type: 'box', position: [-0.18, 0.25, 0], scale: [0.26, 0.06, 0.32], rotation: [0, 0, 0] },
        { id: 'el_94', type: 'box', position: [0.18,  0.25, 0], scale: [0.26, 0.06, 0.32], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'legs_hidden',
      label: 'hidden (skirt)',
      elements: [],
    },
    {
      variantId: 'legs_striped',
      label: 'striped',
      elements: [
        { id: 'el_95',  type: 'box', position: [-0.18, 0.55, 0],    scale: [0.22, 0.65, 0.28], rotation: [0, 0, 0] },
        { id: 'el_96',  type: 'box', position: [0.18,  0.55, 0],    scale: [0.22, 0.65, 0.28], rotation: [0, 0, 0] },
        { id: 'el_97',  type: 'box', position: [-0.18, 0.72, 0.01], scale: [0.24, 0.06, 0.3],  rotation: [0, 0, 0] },
        { id: 'el_98',  type: 'box', position: [0.18,  0.72, 0.01], scale: [0.24, 0.06, 0.3],  rotation: [0, 0, 0] },
        { id: 'el_99',  type: 'box', position: [-0.18, 0.46, 0.01], scale: [0.24, 0.06, 0.3],  rotation: [0, 0, 0] },
        { id: 'el_100', type: 'box', position: [0.18,  0.46, 0.01], scale: [0.24, 0.06, 0.3],  rotation: [0, 0, 0] },
      ],
    },
  ],

  shoes: [
    {
      variantId: 'shoes_sneaker',
      label: 'sneakers',
      elements: [
        { id: 'el_101', type: 'box', position: [-0.119, 0.054, 0.06], scale: [0.17, 0.1,  0.36], rotation: [0, 0, 0] },
        { id: 'el_102', type: 'box', position: [0.119,  0.054, 0.06], scale: [0.17, 0.1,  0.36], rotation: [0, 0, 0] },
        { id: 'el_119', type: 'box', position: [-0.119, 0.175, 0],    scale: [0.16, 0.13, 0.18], rotation: [0, 0, 0] },
        { id: 'el_120', type: 'box', position: [0.119,  0.175, 0],    scale: [0.16, 0.13, 0.18], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'shoes_platform',
      label: 'platforms',
      elements: [
        { id: 'el_103', type: 'box', position: [-0.18, 0.14, 0.02], scale: [0.26, 0.22, 0.38], rotation: [0, 0, 0] },
        { id: 'el_104', type: 'box', position: [0.18,  0.14, 0.02], scale: [0.26, 0.22, 0.38], rotation: [0, 0, 0] },
        { id: 'el_121', type: 'box', position: [-0.18, 0.32, 0],    scale: [0.16, 0.12, 0.18], rotation: [0, 0, 0] },
        { id: 'el_122', type: 'box', position: [0.18,  0.32, 0],    scale: [0.16, 0.12, 0.18], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'shoes_boots',
      label: 'boots',
      elements: [
        { id: 'el_105', type: 'box', position: [-0.18, 0.2, 0.01], scale: [0.23, 0.3, 0.32], rotation: [0, 0, 0] },
        { id: 'el_106', type: 'box', position: [0.18,  0.2, 0.01], scale: [0.23, 0.3, 0.32], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'shoes_rollerskates',
      label: 'roller skates',
      elements: [
        { id: 'el_107', type: 'box',      position: [-0.18, 0.16, 0],    scale: [0.22, 0.18, 0.3],  rotation: [0, 0, 0] },
        { id: 'el_108', type: 'box',      position: [0.18,  0.16, 0],    scale: [0.22, 0.18, 0.3],  rotation: [0, 0, 0] },
        { id: 'el_109', type: 'cylinder', position: [-0.18, 0.05, 0.1],  scale: [0.1, 0.06, 0.1],   rotation: [Math.PI / 2, 0, 0] },
        { id: 'el_111', type: 'cylinder', position: [0.18,  0.05, 0.1],  scale: [0.1, 0.06, 0.1],   rotation: [Math.PI / 2, 0, 0] },
        { id: 'el_110', type: 'cylinder', position: [-0.18, 0.05, -0.1], scale: [0.1, 0.06, 0.1],   rotation: [Math.PI / 2, 0, 0] },
        { id: 'el_112', type: 'cylinder', position: [0.18,  0.05, -0.1], scale: [0.1, 0.06, 0.1],   rotation: [Math.PI / 2, 0, 0] },
        { id: 'el_123', type: 'box',      position: [-0.18, 0.3,   0],   scale: [0.16, 0.1, 0.18],  rotation: [0, 0, 0] },
        { id: 'el_124', type: 'box',      position: [0.18,  0.3,   0],   scale: [0.16, 0.1, 0.18],  rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'shoes_sandals',
      label: 'sandals',
      elements: [
        { id: 'el_113', type: 'box', position: [-0.137, 0.06, 0.042], scale: [0.24, 0.07, 0.36], rotation: [0, 0, 0] },
        { id: 'el_115', type: 'box', position: [0.137,  0.06, 0.042], scale: [0.24, 0.07, 0.36], rotation: [0, 0, 0] },
        { id: 'el_114', type: 'box', position: [-0.135, 0.12, 0.142], scale: [0.2,  0.1,  0.04], rotation: [0, 0, 0] },
        { id: 'el_116', type: 'box', position: [0.135,  0.12, 0.142], scale: [0.2,  0.1,  0.04], rotation: [0, 0, 0] },
      ],
    },
    {
      variantId: 'shoes_bare',
      label: 'bare feet',
      elements: [
        { id: 'el_117', type: 'box', position: [-0.16, 0.07, 0.04], scale: [0.2, 0.1, 0.34], rotation: [0, 0, 0] },
        { id: 'el_118', type: 'box', position: [0.16,  0.07, 0.04], scale: [0.2, 0.1, 0.34], rotation: [0, 0, 0] },
      ],
    },
  ],
};

export const DEFAULT_PREVIEW_COLORS: Record<AvatarPart, string> = {
  hair:  '#3b2a1a',
  head:  '#f5c89a',
  face:  '#1a1a1a',
  neck:  '#f5c89a',
  arms:  '#4a90d9',
  body:  '#4a90d9',
  pants: '#2c3e6b',
  legs:  '#2c3e6b',
  shoes: '#e8e8e8',
};
