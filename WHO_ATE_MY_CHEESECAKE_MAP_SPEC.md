# Who Ate My Cheesecake? --- House Map & Object Specification

## 1. Goal

Rebuild the supplied reference image as a bright, cozy, spacious
**single-story 3/4 top-down 2D game map**.

Non-negotiable: - Bright daytime; cozy does NOT mean dark. - No bedroom,
no second floor, no greenhouse. - Large open living room with a
prominent fireplace. - Kitchen must have a large, clearly visible
refrigerator. - Large dining table and chairs. - Functional
study/library with large bookshelves and desk. - Large furniture, not
tiny decorative icons. - Continuous front path from road/gate to front
entrance. - Residential yard with a small outdoor gym, garden, deck, and
shed. - One believable connected house, not separate rectangular
"fields". - Keep walkable routes around all major furniture. - Do not
use `castle_wall` or `garden_grass` indoors.

## 2. Engine Constraints

Current engine: - Grid: 40×30 - Tile size: 24px - Canvas: 960×720 -
`(0,0)` is top-left. - `#` wall/boundary - `.` outdoor - `+` door - `K`
kitchen - `D` dining - `L` living - `S` study/library - `B` bathroom -
`C` central circulation

Use the existing Y-sorting for DECOR/PROPS.

Visual perspective: - 3/4 top-down - visible top surface + front/side
face - no pure overhead icons - consistent light direction - no
isometric diamond projection - do not add a separate wall-face system

## 3. Overall Footprint

Main house: - approximately `x=8..31` - approximately `y=3..26`

Yard: - left side: `x=1..7` - right side: `x=32..38` - front:
`y=27..29` - rear: `y=1..2`

The house must read as one connected home.

Concept:

``` text
REAR YARD
┌──────────────────────────────────────────────┐
│ KITCHEN │ BATHROOM │      LIVING ROOM       │
│         │          │      FIREPLACE         │
│ DINING  │ CENTRAL / OPEN CIRCULATION     S  │
│         │                                 T  │
│         │              ENTRY              U  │
│         │                                 D  │
│         │                                 Y  │
└──────────────────────────────────────────────┘
       FRONT PATH → GATE → ROAD
   GYM              YARD             GARDEN
```

This is conceptual; use the coordinate ranges below.

## 4. Room Layout

### Kitchen

Approx. `x=9..16, y=4..11`

Floor: light stone/tile.

Required: - **large refrigerator** near an outer wall, around `(10,5)` -
sink - stove - counter - cupboards - kitchen island/work counter -
cooking pot - plates - small plants

The refrigerator is a major gameplay/clue object. It must never be
hidden or visually tiny.

### Dining

Approx. `x=10..17, y=12..18`

Floor: wood.

Required: - large dining table - 6 chairs - centerpiece - plates -
optional food props

Table should occupy roughly 25--35% of the dining space.

### Bathroom

Approx. `x=17..20, y=4..10`

Floor: light blue/stone tile.

Required: - bathtub - toilet - sink - small cabinet - mirror if
available

Compact but immediately recognizable.

### Living Room

Approx. `x=18..30, y=4..17`

This is the largest and most important room.

Floor: warm wood.

Required: - **large fireplace/hearth**, around `(27,5)`, prominent and
SOLID - large sofa / L-shaped sofa - 2 armchairs - large coffee table -
large rug - side tables - plants - shelves/cabinets - lamps

Keep a clear walking loop around the furniture. Do not overcrowd.

### Study / Library

Approx. `x=22..30, y=18..25`

Floor: wood.

Required: - large bookshelf(s) - large desk - chair - armchair - lamp -
books - note/diary - side table

The bookshelves must occupy meaningful wall space.

### Central Entry / Circulation

Approx. `x=18..22, y=17..25`

Keep it open. It connects kitchen/dining, living, study, and front
entrance.

Do not turn the corridor into another room.

## 5. Front Entrance

Main entrance around `(20,26)`.

Required: - centered front door - small landing - continuous stone
path - path from entrance through `y=27..28` - gate around `(20,29)` -
road beyond

The path must visually and physically connect to the house.

## 6. Yard

### Backyard Deck

Approx. `x=2..7, y=10..18`

Required: - wooden deck - round outdoor table - 4--6 chairs - umbrella -
plants

### Outdoor Gym

Approx. `x=2..7, y=19..25`

Small residential gym, not a commercial gym.

Required: - weight bench - dumbbell rack - one compact exercise
machine - exercise mat - optional storage rack

Leave walking space around equipment.

This is a gameplay location because NPCs can claim they exercised there.

### Right Garden

Approx. `x=32..37, y=15..25`

Required: - 3--4 raised vegetable beds - watering can - garden tools -
plant pots - stepping-stone path

Garden must remain smaller than the house.

### Shed

Approx. `x=33..37, y=5..10`

Small wooden shed.

Required: - shelves - boxes - baskets - garden tools - watering can

## 7. Required SPUM Objects

Existing/reusable: - `wood_floor` - `fridge` - `hearth` - `long_table` -
`shelf` - `empty_plate` - `sofa_l` - `sofa_r` - `sink` - `stove` -
`counter` - `cupboard` - `armchair` - `desk` - `washtub`

Already created: - `lamp` - `cheesecake` - `bookshelf_large` -
`plant_pot` - `watering_can` - `note` - `diary` - `wooden_door` -
`cooking_pot` - `boxes` - `baskets` - `books` - `plates`

Do NOT use: - `bed_top` - `bed_bottom` - `stairs` as a second-floor
feature - `castle_wall` indoors - `garden_grass` indoors

## 8. Object Scale

The current problem is that furniture is too small.

Use: - Fireplace: LARGE - Refrigerator: LARGE - Dining table: LARGE -
Sofa: LARGE - Bookshelf: LARGE - Desk: MEDIUM-LARGE - Kitchen counter:
MEDIUM-LARGE - Armchair: MEDIUM - Side table: SMALL-MEDIUM -
Books/plates/plants: SMALL

Prefer fewer large, meaningful objects over many tiny objects.

If necessary, enlarge room dimensions rather than shrinking important
furniture.

## 9. Visual Style

Bright natural daylight: - light wood - light stone - clear windows -
vivid but natural greenery - soft shadows - warm, comfortable colors

Target mood: **bright + warm + lived-in + spacious + comfortable**

Avoid: **dark + cramped + cluttered + repetitive**

## 10. Gameplay Locations

These locations must be visually distinct and reachable:

-   refrigerator
-   dining table
-   fireplace
-   living room
-   kitchen
-   study desk
-   bookshelves
-   front entrance
-   backyard deck
-   outdoor gym
-   garden
-   shed

NPCs should plausibly be able to say: - "I was in the kitchen." - "I was
by the fireplace." - "I was at the dining table." - "I was reading in
the study." - "I was exercising in the outdoor gym." - "I was watering
the garden." - "I was in the shed." - "I was on the deck."

## 11. Weather / Alibi

The outdoor gym and yard are evidence locations.

Weather is objective environmental data that can challenge NPC
testimony.

Example: - 22:00 --- Rain - NPC: "I was exercising in the outdoor gym at
22:00." - Player: "It was raining at 22:00. You exercised outside?"

Therefore the gym must be a real, identifiable, reachable location.

## 12. Walkability Validation

Required paths: - entrance → central space - central → kitchen - central
→ dining - central → living - central → study - kitchen → dining -
living → study - house → yard - yard → gym - yard → garden - yard → shed

After implementation test: 1. all SPOTs 2. A\* between all room SPOTs 3.
player → refrigerator 4. player → fireplace 5. player → study desk 6.
player → outdoor gym 7. player → garden 8. player → shed

## 13. Implementation Order

1.  Replace GRID with the new house footprint.
2.  Set floor materials.
3.  Establish front entrance and continuous path.
4.  Build kitchen + refrigerator.
5.  Build dining + large table.
6.  Build large living room + fireplace.
7.  Build study + large bookshelves + desk.
8.  Build bathroom.
9.  Build deck.
10. Build outdoor gym.
11. Build garden.
12. Build shed.
13. Place major furniture.
14. Place smaller props.
15. Validate walkability.
16. Validate SPOTs.
17. Run and visually inspect.
18. Commit + push.

## 14. Acceptance Criteria

-   [ ] Bright daytime
-   [ ] Single story
-   [ ] No bedroom
-   [ ] No greenhouse
-   [ ] Large open living room
-   [ ] Prominent fireplace
-   [ ] Large visible refrigerator
-   [ ] Large dining table
-   [ ] Functional study/library
-   [ ] Large bookshelves
-   [ ] Furniture is large enough to read clearly
-   [ ] Connected central circulation
-   [ ] Continuous front path
-   [ ] Residential yard
-   [ ] Small outdoor gym
-   [ ] Vegetable garden
-   [ ] Small shed
-   [ ] Balanced house/yard proportions
-   [ ] No random object scattering
-   [ ] No indoor grass
-   [ ] No indoor `castle_wall`
-   [ ] All major objects accessible
-   [ ] All SPOTs walkable
-   [ ] All major A\* routes work
-   [ ] Refrigerator, fireplace, study, gym, garden and shed are
    reachable
-   [ ] Consistent 3/4 perspective
-   [ ] Y-sorting remains enabled

## 15. Reference Image Rule

Use the supplied image as the visual reference for: - composition - room
hierarchy - relative room sizes - furniture scale - bright daylight -
cozy but spacious feeling - indoor/outdoor relationship - 3/4
perspective

Do not copy pixels literally. Translate the visual structure into the
existing 24px tile/SPUM system.

**The result should look like one believable home first, and a game map
second.**
