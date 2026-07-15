export type SeasonArcPhase = { phase: string; figure: string | null; body: string; summary?: string; prompt?: string };

export type SeasonArcCopy = { story: string; phases: SeasonArcPhase[] };

export const seasonArcCopyBySign: Record<string, SeasonArcCopy> = {
  "Capricorn": {
    "story": "Capricorn's story begins with the Forgotten One, the child nobody noticed. Undervalued and overlooked, he starts building his own way up because no one else is coming for him. Eventually he steps out of the shadows, picks his mountain, and begins the climb. Partway up, he spots silver in the rock and abandons the climb to dig, telling himself the wealth will buy him the respect the summit would have earned. The way out of that tunnel is craft: he brings the metal up and learns to shape it, and for the first time the work matters more than what it sells for. The work carries him to authority. He becomes the elder of the family, holding everyone through structure and duty, providing without rest. But when the respect he expected doesn't come back the way he wanted, he starts withholding, keeping score, gripping what he built. He sits on the hoard so long he becomes the Dragon: still guarding the treasure, but what he hoards now is wisdom, given out carefully to the few who prove they can carry it.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Stone",
        "body": "Capricorn Season begins where effort becomes real. This is the part of the cycle where you notice what needs structure, commitment, or a more honest relationship with time. The beginning may feel quiet or unsupported, but that is part of the teaching. You are not building for applause yet. You are finding the thing worth taking seriously.",
        "summary": "Name what is worth taking seriously before anyone rewards it.",
        "prompt": "What am I ready to build with more honesty?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Climb",
        "body": "By the Crescent Moon, the work starts asking for a path. You may notice the first signs of ambition, pressure, planning, or resistance. The task is not to reach the summit immediately. It is to choose the mountain carefully and take the next step without turning the whole future into a burden.",
        "summary": "Choose the mountain and take the next practical step.",
        "prompt": "What direction deserves my steady effort?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Cost Test",
        "body": "At the First Quarter Moon, Capricorn Season asks what the climb is costing. You may be tempted to trade purpose for proof, craft for status, or self-respect for a visible win. This is where ambition needs ethics. The Moon asks you to notice what you are digging for, and what you are abandoning to get it.",
        "summary": "Check what ambition is costing before you keep digging.",
        "prompt": "What am I trying to earn, prove, or buy?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Craft",
        "body": "By the Gibbous Moon, the raw material is in your hands. This phase asks for refinement, skill, and patience with the unglamorous part of mastery. The work may not be finished, but it can become more honest. Shape what you have gathered until the process itself becomes worthy of respect.",
        "summary": "Shape the raw material until the work becomes worthy.",
        "prompt": "What part of the work needs more craft and less performance?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Responsibility",
        "body": "The Full Moon shows what your structure is holding. It can reveal authority, duty, obligation, and the people or promises that depend on you. This is the emotional high point of Capricorn Season: can you carry responsibility without becoming hard, withholding, or unreachable? Strength is not the same as distance.",
        "summary": "Hold responsibility without letting duty replace tenderness.",
        "prompt": "Where has responsibility made me harder than I need to be?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Public Load",
        "body": "After the Full Moon, the work moves outward. You may be carrying, providing, organizing, or setting the standard for others. This phase asks you to share what has been built without silently keeping score. Let support be named clearly instead of turning sacrifice into a private ledger.",
        "summary": "Share the load clearly instead of keeping score.",
        "prompt": "What do I need to name instead of silently resenting?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Withholding",
        "body": "At the Last Quarter Moon, Capricorn Season reviews the defenses built around disappointment. Maybe the respect did not come. Maybe the labor was unseen. Maybe you started gripping what you once meant to offer. The Moon asks what you are withholding now, and whether it is protection or punishment.",
        "summary": "Notice what you are withholding and why.",
        "prompt": "Where am I protecting myself by gripping too tightly?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Earned Wisdom",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where achievement turns into wisdom, or hardens into a hoard. You do not have to keep proving what you survived, learned, or built. Decide what gets passed on, what gets released, and what no longer needs to define your worth.",
        "summary": "Pass on the wisdom. Stop guarding the old proof.",
        "prompt": "What have I earned that is ready to become wisdom?"
      }
    ]
  },
  "Aquarius": {
    "story": "Aquarius's story begins with the Father's Son, the Golden Boy, told from birth that he is special and playing the part so fluently he loses track of what he feels. His sister the Father's Daughter proves herself in the Father's world, casting her loyalty outward and leaving half of herself behind to earn it. Then the model breaks, and the Rebel throws out everything connected to the old authority, the useful parts included, saved only by friends he respects enough to let them disagree. The Trickster learns subtler tools, turning the system sideways to reveal its hidden assumptions. What he finds on the other side is the Friendship Moon: community, chosen family, connection between equals. The Apostle carries the doctrine of hope outward to anyone who will hear it. Then he says the thing the group cannot accept, and the Heretic is cast out of the home he fought to earn, learning that free choice means being able to walk away from anything. In the end the Prophet is found again in his last years, asked about the future, telling it whether or not they believe.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The Assigned Role",
        "body": "Aquarius Season begins with the question of belonging without performance. This is the part of the cycle where you notice the role you have been assigned, the approval you have learned to earn, or the version of yourself that keeps the system comfortable. The beginning asks for distance: enough space to feel what is true underneath the part you play.",
        "summary": "Notice the role you have been playing before you rebel against it.",
        "prompt": "What part of me has been performing belonging?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Distance",
        "body": "By the Crescent Moon, the self starts separating from the old model. You may notice the cost of approval, the pressure to prove usefulness, or the parts of you that went quiet to stay included. This phase asks you to make room for difference before it has to become rupture.",
        "summary": "Make room for difference before it has to become rupture.",
        "prompt": "What am I leaving behind to stay accepted?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Break",
        "body": "At the First Quarter Moon, Aquarius Season reaches the break point. Something in the old system no longer works. The Moon asks you to separate reaction from choice. Rebellion can clear space, but it can also throw away what still has value. Keep the people who can disagree with you without asking you to disappear.",
        "summary": "Make the break a decision, not only a reaction.",
        "prompt": "What am I rejecting, and what still deserves to come with me?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Pattern Shift",
        "body": "By the Gibbous Moon, the work becomes more precise. You can see the hidden assumptions, strange incentives, and stale rules more clearly. This phase asks you to turn the system sideways, but with purpose. Innovation is not only disruption. It is the clean adjustment that lets a truer pattern emerge.",
        "summary": "Turn the system sideways so the hidden pattern shows itself.",
        "prompt": "What rule needs to be questioned with care?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Collective Mirror",
        "body": "The Full Moon shows the difference between a community and an ideology. It can reveal where belonging is real, where distance has become superiority, or where the group has replaced actual intimacy. This is the emotional high point of Aquarius Season. The Moon asks you to stay human inside the collective.",
        "summary": "See where community is real and where distance is hiding intimacy.",
        "prompt": "Where am I using distance to avoid being known?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Shared Signal",
        "body": "After the Full Moon, the vision starts moving outward. You may be sharing an idea, inviting people in, or carrying hope into a wider field. This phase asks you to communicate without turning the message into doctrine. Let the future stay alive enough to keep listening.",
        "summary": "Share the vision without turning it into doctrine.",
        "prompt": "What idea needs to be shared without becoming a test of loyalty?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Heresy",
        "body": "At the Last Quarter Moon, Aquarius Season reviews the cost of free thought. You may see where a group cannot hold your truth, or where your need to be different has become its own trap. The Moon asks what freedom actually requires now: departure, repair, honesty, or a less performative kind of independence.",
        "summary": "Review where free thought costs belonging, and choose cleanly.",
        "prompt": "Where do I need freedom without making exile my identity?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Future Memory",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where distance becomes perspective, and perspective becomes responsibility. You may see the future more clearly, but the Moon asks you to stay connected to the present enough to matter. Keep the signal. Release the isolation around it.",
        "summary": "Keep the future signal without disappearing from the present.",
        "prompt": "What future am I listening for, and who needs me here now?"
      }
    ]
  },
  "Pisces": {
    "story": "Pisces's story begins with the Dreamer, the child who lives half in another world. When it is time to choose a direction, she chooses the more tempting one, and the Mermaid disappears into the water of the fantasy world. She is taken captive, her energy drained away for other people's benefit, and the Martyr learns both the worth of sacrifice and its hidden hook: the quiet superiority, the power of being needed. The feeling finds form, and the Poet translates what ordinary speech cannot hold. Then the great turn: instead of being drained, the Healer opens himself upward to something greater, and the energy flows through him instead of out of him. The Angel of Mercy swears to keep caring, tending the suffering of the world day after day. The vow costs everything, and the Lost Soul goes gray and empty, saved only by hope borrowed from watching the strong keep fighting. In the end the Mystic reaches up one last time and finally touches what always slipped away: the mystery itself, which deepens the human life instead of replacing it.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Dream",
        "body": "Pisces Season begins where the edges soften. This is the part of the cycle where longing, intuition, grief, imagination, or compassion starts moving before it has language. The beginning asks you to honor the dream without letting it dissolve your life. Give the feeling a vessel, even if it is small.",
        "summary": "Honor the dream and give it a vessel.",
        "prompt": "What feeling is asking for form?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Enchantment",
        "body": "By the Crescent Moon, the dream starts pulling harder. You may notice fantasy, avoidance, romance, escape, or the wish to disappear into something beautiful. This phase asks you to notice what the longing is protecting, and to let it make something instead of carrying you away.",
        "summary": "Notice the escape route and turn the longing into something real.",
        "prompt": "Where am I tempted to disappear instead of feel?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Sacrifice Test",
        "body": "At the First Quarter Moon, Pisces Season asks where compassion has crossed into self-erasure. Giving can be beautiful, but it can also become a way to avoid having needs. The Moon asks you to give cleanly, without quiet superiority, resentment, or the hidden hope that being needed will keep you safe.",
        "summary": "Give cleanly without using sacrifice to erase yourself.",
        "prompt": "Where has compassion become self-abandonment?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Translation",
        "body": "By the Gibbous Moon, the feeling needs a language. This phase asks you to translate what ordinary speech cannot hold: through art, prayer, rest, music, image, or ritual. The work is to let symbol help the feeling move, without letting the symbol replace the actual tending.",
        "summary": "Translate the feeling without letting the symbol replace the care.",
        "prompt": "What form can hold what I cannot explain?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Open Channel",
        "body": "The Full Moon shows the difference between being open and being drained. It can reveal where mercy flows through you, and where your boundaries have become too porous to protect a life. This is the emotional high point of Pisces Season. The Moon asks you to let compassion move without becoming the source for everyone.",
        "summary": "Let compassion move through you without letting it drain you.",
        "prompt": "Where do I need a clearer boundary around my openness?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Shared Mercy",
        "body": "After the Full Moon, the tenderness moves outward. You may be called to care, forgive, soothe, or witness suffering. This phase asks you to include yourself in the mercy you offer. Service becomes distorted when it requires you to vanish.",
        "summary": "Offer mercy outward while including yourself in it.",
        "prompt": "How can I care without disappearing?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Fog",
        "body": "At the Last Quarter Moon, Pisces Season reviews the places where depletion, confusion, or grief has taken over. You may not be able to force clarity yet. The Moon asks for rest, honesty, and borrowed steadiness. You do not have to solve the whole fog to stop walking deeper into it.",
        "summary": "Stop forcing clarity. Rest near what is steady.",
        "prompt": "Where am I depleted enough to need support?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Human Mystery",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where mystery becomes wisdom, or escape becomes another loop. The Moon asks you to let the unseen deepen your human life instead of replacing it. Keep the softness. Release the fantasy that asks you to leave yourself behind.",
        "summary": "Let the mystery deepen life instead of replacing it.",
        "prompt": "What am I ready to release back into the unknown?"
      }
    ]
  },
  "Aries": {
    "story": "Aries's story begins with the Infant, brand new and hungry, wanting everything now. The wanting finds a cause, and the Torch-Bearer runs laughing after an ideal worth following. The world knocks the ideal down enough times that the Brigand appears, angry and cynical, striking first, still believing underneath. Robbing people does nothing for his self-respect, so he decides he can do better than this and becomes the Adventurer, testing himself against bigger things: endurance, danger, feats of nerve. The tests forge him into the Warrior, who fights in the open, in honor, for a cause worth protecting. The Warrior learns the cause is bigger than one fighter and joins the ranks as the Soldier, giving his fire to a mission and learning to fight beside others. The war ends and the Survivor comes home carrying it, angry at everyone who expects him to be over it, learning that courage now means admitting the damage and healing without a schedule. In the end he is the Veteran, retired from the front lines, scarred and clear-eyed, telling the truth about the fight without making it glorious.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Want",
        "body": "Aries Season begins with the first honest want. This is the part of the cycle where energy returns before strategy does. You may feel urgency, hunger, impatience, courage, or the need to move before you know the whole plan. The beginning asks you to admit what you want without confusing desire with permission.",
        "summary": "Admit the want before turning it into a fight.",
        "prompt": "What do I want clearly enough to name?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Spark",
        "body": "By the Crescent Moon, the want starts looking for a cause. Motivation gathers around something that feels worth chasing. This phase asks you to choose the spark carefully. Not every rush deserves your fire, and not every invitation needs an immediate yes.",
        "summary": "Choose what deserves your fire before you run after it.",
        "prompt": "What cause, desire, or direction is actually worth my energy?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Anger Test",
        "body": "At the First Quarter Moon, Aries Season meets resistance. The world pushes back, and anger may rise quickly. This phase asks you to separate clean action from reaction. Anger can show where something matters, but it does not get to choose the whole response for you.",
        "summary": "Use anger as information, not as the whole response.",
        "prompt": "What is my anger protecting, and what response would be clean?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Courage Test",
        "body": "By the Gibbous Moon, the story becomes a test of courage. You may need to try, risk, compete, or prove something to yourself. The Moon asks you to aim the fire at growth instead of grievance. Test yourself against something bigger than a grudge.",
        "summary": "Aim the fire at growth, not only at the obstacle.",
        "prompt": "What brave action would make me respect myself?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Open Fight",
        "body": "The Full Moon shows what the fight is really about. It can reveal courage, conflict, competition, or the cause that deserves protection. This is the emotional high point of Aries Season. The Moon asks you to fight in the open, with honor, for something worth protecting rather than only something worth winning.",
        "summary": "Fight openly for what deserves protection.",
        "prompt": "What am I willing to defend without losing myself?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Shared Mission",
        "body": "After the Full Moon, the fire joins a larger mission. You may be working alongside others, lending strength, or learning how your courage affects the group. This phase asks you to keep your conscience inside the mission. Belonging to a cause does not erase personal responsibility.",
        "summary": "Join the mission without handing over your conscience.",
        "prompt": "Where do I need to act with others and still stay accountable?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Fight Habit",
        "body": "At the Last Quarter Moon, Aries Season reviews the habits left behind by conflict. The fight may be over, but your body may still be braced. The Moon asks what survival pattern is still running: defensiveness, speed, suspicion, or the need to strike first. Healing does not need a deadline.",
        "summary": "Notice the fight habit that is still running.",
        "prompt": "Where am I still reacting as if the fight is happening now?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Honest Scar",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where courage becomes wisdom, and battle stories lose their glamour. The Moon asks you to tell the truth about the fight without polishing it, replaying it, or turning it into your whole identity.",
        "summary": "Tell the truth about the fight without living inside it.",
        "prompt": "What can I lay down now that I have survived it?"
      }
    ]
  },
  "Taurus": {
    "story": "Taurus's story begins with the Dryad, who belongs to the land and the body, not yet separate from the living world. She learns to plant on purpose and becomes the Gardener, tending what she chose to grow. Needing more room and more money, the Woodcutter cuts down the woods he came from, choosing his own survival over what he used to belong to. He plants again on the cleared land and becomes the Farmer, working with cycles, weather, and yield. The harvest grows until she is the Earth Mother, generous enough to feed and hold everyone who comes. The abundance turns outward and the Builder makes things that last, roofs and walls for people who have none. Then the earning becomes its own goal, and the Merchant has to learn what things actually cost and what they return. In the end the Ancestor sorts the whole estate: what was built, what was kept, and what deserves to be passed down.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Ground",
        "body": "Taurus Season begins by returning to what is real enough to touch. This is the part of the cycle where the body, the senses, money, food, land, rhythm, and value become louder. The beginning asks you to slow down and notice what actually supports life, not what only looks secure from a distance.",
        "summary": "Return to what is real enough to support you.",
        "prompt": "What does my body know is real right now?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Tending",
        "body": "By the Crescent Moon, the value needs care. Something small wants repetition, patience, watering, feeding, or protection from hurry. This phase asks you to tend what you chose to grow. Growth is not proven by speed. It is proven by return.",
        "summary": "Tend what you want to grow through repetition.",
        "prompt": "What needs steady care instead of urgency?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Bargain",
        "body": "At the First Quarter Moon, Taurus Season asks what security costs. You may need to clear space, spend resources, make a trade, or admit that comfort has a price. The Moon asks you to see the bargain plainly before you make it. Survival matters, but not every exchange is worth what it takes.",
        "summary": "See the cost of security before you make the trade.",
        "prompt": "What am I trading for comfort or stability?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Stewardship",
        "body": "By the Gibbous Moon, the work becomes stewardship. You can see the rhythms, seasons, limits, and conditions that affect what you are growing. This phase asks you to work with the cycle instead of forcing yield on command. Care becomes wiser when it respects timing.",
        "summary": "Work with the cycle instead of forcing yield.",
        "prompt": "What condition needs to change so growth can continue?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Harvest Mirror",
        "body": "The Full Moon shows what has become abundant, and what abundance asks of you. It can reveal generosity, attachment, pleasure, possessiveness, or the fear that there will not be enough. This is the emotional high point of Taurus Season. The Moon asks you to receive and give without turning care into ownership.",
        "summary": "Receive the harvest without turning care into ownership.",
        "prompt": "Where does generosity need less control?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Durable Gift",
        "body": "After the Full Moon, the harvest moves outward. This phase asks what can be built, shared, repaired, or made useful for more than one person. The Moon favors practical generosity: something with a roof, a rhythm, a meal, a tool, or a promise that can hold weight.",
        "summary": "Build something useful enough to be shared.",
        "prompt": "What can I make more durable, useful, or generous?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Accounting",
        "body": "At the Last Quarter Moon, Taurus Season asks you to review what things cost and what they return. This is not only about money. It is about attention, body, time, loyalty, pleasure, and peace. The Moon asks what is worth keeping, and what is too expensive to keep feeding.",
        "summary": "Keep what is worth the price and release what is not.",
        "prompt": "What am I paying too much to maintain?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Inheritance",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where value becomes inheritance: what you keep, what you return, what you pass down, and what you stop preserving. The Moon asks you to sort the estate of the season with honesty.",
        "summary": "Decide what is worth keeping, passing on, or releasing.",
        "prompt": "What value am I ready to carry forward?"
      }
    ]
  },
  "Gemini": {
    "story": "Gemini's story begins with the Little Brother, who learns by watching, copying, and asking questions. His twin the Little Sister learns the social side, using words as relationship and reading the room. Then words discover their power to bend things, and the Liar spins versions until even he can't remember which one is true. The words go professional, and the Mercenary sells his skill to whoever pays, learning the hard way what flexible ethics cost. Out of all of it comes the Storyteller, who holds every lie and all the imagination, and knows that how a thing is told shapes what it becomes. The Scribe writes it down, records, copies, and carries knowledge outward. The Magician discovers the words have been shaping reality itself, and that he has been exempting himself from every rule he applies to others. In the end the Teacher takes everything the words did, right and wrong, and translates it so someone else can carry it.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Question",
        "body": "Gemini Season begins with curiosity before certainty. This is the part of the cycle where questions, messages, choices, names, and small observations start multiplying. The beginning asks you to listen, ask, and experiment with language before you rush to make a final story.",
        "summary": "Let the question open before you decide the story.",
        "prompt": "What question is trying to get my attention?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Exchange",
        "body": "By the Crescent Moon, the words start moving between people. You may notice texts, conversations, social cues, or the desire to be understood quickly. This phase asks you to say what you mean, not only what lands well. Connection needs accuracy as much as charm.",
        "summary": "Say what you mean, not only what lands.",
        "prompt": "Where do I need cleaner language?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Bent Word",
        "body": "At the First Quarter Moon, Gemini Season asks where language has bent away from truth. A story may have become convenient, clever, evasive, or too flexible to trust. The Moon asks you to find the distortion without shaming the need underneath it.",
        "summary": "Find the distortion and the need underneath it.",
        "prompt": "What story have I been bending to avoid a simpler truth?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Cleverness Test",
        "body": "By the Gibbous Moon, skill becomes useful and therefore tempting. You may see how easily words, information, timing, or wit can be used to get a result. This phase asks you to keep ethics attached to cleverness. Being persuasive is not the same as being clear.",
        "summary": "Keep ethics attached to cleverness.",
        "prompt": "Where am I being persuasive instead of clear?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Story Mirror",
        "body": "The Full Moon shows the story you are living inside. It can reveal what your language has clarified, confused, exaggerated, or hidden. This is the emotional high point of Gemini Season. The Moon asks you to tell the story so it reveals the truth instead of replacing it.",
        "summary": "Tell the story so it reveals the truth.",
        "prompt": "What story becomes more honest when I tell it plainly?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Record",
        "body": "After the Full Moon, the message needs to be recorded, shared, taught, or passed along. This phase asks you to preserve the useful knowledge without turning it into noise. Write it down. Name the point. Let the information travel cleanly.",
        "summary": "Record what is useful so it can travel cleanly.",
        "prompt": "What needs to be written, named, or clarified?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Framing Spell",
        "body": "At the Last Quarter Moon, Gemini Season reviews what your words have built. A frame can clarify reality, but it can also trap it. The Moon asks you to test your own framing the way you test everyone else's. What did your language make possible, and what did it make harder to see?",
        "summary": "Review what your words built and what they obscured.",
        "prompt": "What frame am I ready to revise?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Teaching",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where information becomes understanding. The Moon asks what is worth teaching, what is worth forgetting, and how to meet the learner where they are. Not every thought needs to become a lesson.",
        "summary": "Turn information into understanding, then release the noise.",
        "prompt": "What have I learned well enough to simplify?"
      }
    ]
  },
  "Cancer": {
    "story": "Cancer's story begins with the Mother's Daughter, whose identity is still woven into her mother's, the self forming through being held. Her brother the Mother's Son already knows he is different from the mother, and that the difference will someday come between them. Then the unthinkable: home is lost, and the Orphan weeps behind walls built half for protection, half as a test to see who cares enough to get through. She grows into the Life-Giver, creating and tending life of her own, learning to make only what she can sustain. The care deepens until she is the Sea Mother, tidal and generous, able to hold everyone. Her mate the Shield-Father steps out the door to guard the shelter, turning feeling into defense. Loss comes again, this time to the adult, and the Widow chooses between building something from the grief or living locked inside the memories. In the end she is the Keeper of Memories. She guards the family's stories and keeps them accurate, instead of rewriting them, romanticizing them, or turning them into weapons, and she does the slow, deliberate work of forgiveness.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Need",
        "body": "Cancer Season begins with the question of what needs care. This is the part of the cycle where you notice what feels raw, private, protective, or newly important. The beginning is quiet because it is still forming. You do not have to explain it yet. You only have to admit that something in you needs more safety, more honesty, or more room to feel.",
        "summary": "Notice what needs care before you explain it.",
        "prompt": "What am I beginning to care about again?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Reach",
        "body": "By the Crescent Moon, the need starts looking for a place to land. You may notice yourself reaching for comfort, reassurance, familiar people, old habits, or small signs that you are not alone in this. The work is to notice what actually helps, and what only repeats an old dependency.",
        "summary": "Look at what kind of support you are reaching for.",
        "prompt": "What kind of support am I reaching for?"
      },
      {
        "phase": "First Quarter",
        "figure": "The First Boundary",
        "body": "At the First Quarter Moon, care meets pressure. Something asks you to choose between protecting your peace and keeping everyone comfortable. This is where Cancer Season gets more honest. A boundary is not a rejection. It is how care survives contact with real life.",
        "summary": "Protect care from becoming resentment.",
        "prompt": "Where do I need a boundary so care does not turn into resentment?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Care Test",
        "body": "By the Gibbous Moon, the story becomes more specific. You can see what you have been tending, and also what is taking more from you than it gives back. This phase asks you to adjust the way you care. Not everything needs more effort. Some things need better conditions.",
        "summary": "Adjust what you are tending and how much it costs you.",
        "prompt": "What am I over-tending?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Mirror",
        "body": "The Full Moon shows the difference between a home and a hiding place. It can reveal where protection has become control, where closeness has become obligation, or where old fear is deciding how much you let people in. This is the emotional high point of the season. What is exposed now is not here to shame you. It is here so you can stop confusing survival with safety.",
        "summary": "See where protection has become isolation.",
        "prompt": "Where have I been protecting myself in a way that keeps me alone?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Aftermath",
        "body": "After the Full Moon, the feeling has already spoken. Now you are living with what it revealed. This phase asks you to share the truth carefully, not dramatically. Say what needs to be said. Let people know what changed. Do not turn the revelation into a performance, a punishment, or a permanent story about who you are.",
        "summary": "Share the truth without turning it into a weapon.",
        "prompt": "What truth needs to be shared without making it bigger than it is?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Old Defense",
        "body": "At the Last Quarter Moon, Cancer Season asks you to review the defense system you built around pain. Maybe it helped once. Maybe it kept you moving when you did not have better options. But now you can ask whether the old guard is still needed. You do not have to be ashamed of how you survived. You just do not have to keep living from that place.",
        "summary": "Review the survival habit that is still running.",
        "prompt": "Which survival habit am I still running that I no longer need?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Clean Memory",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where you decide what memory gets to become wisdom, and what memory needs to stop running the room. Forgiveness does not mean pretending it was fine. It means refusing to keep feeding the same old pain with new life.",
        "summary": "Keep the lesson. Stop feeding the old pain.",
        "prompt": "What am I ready to remember differently?"
      }
    ]
  },
  "Leo": {
    "story": "Leo's story begins with the Sun Child, shining and playing before self-consciousness arrives. He learns that people love to laugh, and the Clown performs, clumsy but sincere. The skill sharpens until the Actor can become whatever the audience wants, and starts losing track of where the roles end and he begins. He retreats to write his own songs, and the Singer discovers she misses the applause less than she feared. The voice carries her to the throne, and the Queen rules with warmth and presence, her danger the pride that keeps people at arm's length. The King turns outward, building alliances and providing, learning that being central is not the same as being useful. Then the crowd turns, and the Usurper's moment arrives: thrown down, or stepping down willingly so the people can eat. In the end the Bard returns to the stage with the experience of power behind him, using the voice to keep even rulers honest.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Light",
        "body": "Leo Season begins with the question of what wants to be expressed. This is the part of the cycle where play, warmth, visibility, creativity, and pleasure start to return before self-consciousness has fully arrived. The beginning asks you to let the heart show up simply, without turning expression into proof.",
        "summary": "Let expression begin before self-consciousness edits it.",
        "prompt": "What wants to be expressed before I judge it?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Response",
        "body": "By the Crescent Moon, expression starts meeting an audience. You may notice what gets the laugh, the praise, the attention, or the warm response. This phase asks you to enjoy being received without letting the reaction become the reason you perform.",
        "summary": "Enjoy the response without becoming dependent on it.",
        "prompt": "Where am I performing for approval instead of sharing honestly?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Mask Test",
        "body": "At the First Quarter Moon, Leo Season asks where performance has started to overtake presence. A role may be working too well. You may know what people want from you, but not what you feel while giving it. The Moon asks you to notice the mask and decide what you are not willing to sell for applause.",
        "summary": "Notice the role before it replaces the self.",
        "prompt": "What version of me gets rewarded, and what does it cost?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The True Voice",
        "body": "By the Gibbous Moon, the performance needs to become more personal. This phase asks you to make your own song, choose your own gesture, or return to the center of your creative life. The work is to refine expression until it sounds like you, not only like what people clap for.",
        "summary": "Refine the expression until it sounds like you.",
        "prompt": "What would I make if applause were not the point?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Warm Throne",
        "body": "The Full Moon shows how you hold attention, power, and affection. It can reveal generosity, pride, creative courage, or the distance that forms when being seen becomes too important. This is the emotional high point of Leo Season. The Moon asks you to rule with warmth and let love reach you.",
        "summary": "Hold visibility with warmth instead of pride.",
        "prompt": "Where does pride keep people farther away than I want?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Useful Center",
        "body": "After the Full Moon, the light moves outward. You may be asked to lead, encourage, host, provide, or use your visibility for more than self-expression. This phase asks you to remember that being central is not the same as being useful. Let warmth become service.",
        "summary": "Use visibility to encourage and provide.",
        "prompt": "How can my presence make more room for others?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Throne Question",
        "body": "At the Last Quarter Moon, Leo Season reviews your relationship with attention and control. Something may need to be shared, handed over, stepped down from, or held more lightly. The Moon asks whether you are protecting the creative fire, or only defending your place at the center.",
        "summary": "Review what needs to be shared, released, or held lightly.",
        "prompt": "Where am I defending attention instead of protecting love?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Honest Song",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where expression becomes testimony instead of performance. The Moon asks you to use your voice to keep the story honest, including the parts about power, pride, and the need to be loved.",
        "summary": "Use the voice honestly after the applause fades.",
        "prompt": "What truth can my creative voice carry now?"
      }
    ]
  },
  "Virgo": {
    "story": "Virgo's story begins with the Maiden, whole in herself, private and discerning. She leaves the walled garden not for company but for useful work, and the Apprentice learns through practice and mistakes. The skill curdles into the Counting Moon, a locked room where everything is measured, everyone's faults are tallied, and nothing chaotic gets in, including people. Life loses patience and shoves her into the Housewife's world, balancing tasks and humans at the same time. She emerges as the Spinner, first of the Fates, at the center of a web where small careful motions make the thread of a life. The Weaver, the second Fate, joins the threads into a tapestry, learning to work with others instead of holding every strand alone. The third Fate holds the scissors, and her job is the necessary no: cutting the cord, marking the line, accepting the resentment. In the end the Monk withdraws into a community of silence and work, where the service is clean and the solitude is chosen.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Discernment",
        "body": "Virgo Season begins with the question of what needs care, repair, or clearer order. This is the part of the cycle where small details start speaking. The beginning asks you to notice what is useful without turning usefulness into self-erasure. Start simple, private, and honest.",
        "summary": "Notice what needs care without making yourself a project.",
        "prompt": "What small thing is asking for my attention?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Practice",
        "body": "By the Crescent Moon, care becomes practice. You may be learning through repetition, mistakes, adjustment, and humble effort. This phase asks you to let imperfection teach you instead of treating it as evidence that you have failed.",
        "summary": "Let practice and mistakes teach the next adjustment.",
        "prompt": "What am I learning through repetition?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Perfection Test",
        "body": "At the First Quarter Moon, Virgo Season asks where discernment has turned into counting, criticism, or control. The desire to improve something may be real, but the Moon asks whether the measuring is helping life work better, or keeping life out.",
        "summary": "Check whether improvement has become control.",
        "prompt": "Where is the measuring no longer helping?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Human System",
        "body": "By the Gibbous Moon, the work has to include real people, bodies, needs, interruptions, and limits. This phase asks you to refine the system without forgetting the humans it is meant to serve. A routine that cannot hold a human life is not actually working.",
        "summary": "Make the system serve the humans, not the other way around.",
        "prompt": "What routine needs to become more humane?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Pattern Mirror",
        "body": "The Full Moon shows the pattern made by all the small choices. It can reveal skill, stress, service, resentment, and the web of details holding life together. This is the emotional high point of Virgo Season. The Moon asks you to see the whole cloth, not only the thread that is out of place.",
        "summary": "See the whole pattern, not only the flaw.",
        "prompt": "What pattern becomes visible when I stop staring at one detail?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Shared Weave",
        "body": "After the Full Moon, the repair moves outward. You may need to coordinate, delegate, document, help, or let someone else hold part of the thread. This phase asks you to serve without becoming the only person allowed to know how everything works.",
        "summary": "Share the work instead of holding every thread alone.",
        "prompt": "What can I teach, delegate, or stop carrying by myself?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Necessary No",
        "body": "At the Last Quarter Moon, Virgo Season reviews the line that needs to be cut. Some tasks, obligations, standards, or repairs are no longer yours. The Moon asks for the necessary no: clean, specific, and willing to be misunderstood if that is the cost of integrity.",
        "summary": "Cut the cord that keeps service from staying clean.",
        "prompt": "What necessary no would restore my integrity?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Clean Service",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where service becomes devotion, or avoidance wearing useful clothes. The Moon asks what can be simplified, released, cleaned, and returned to quiet purpose.",
        "summary": "Simplify service until only the clean purpose remains.",
        "prompt": "What am I ready to release from the work?"
      }
    ]
  },
  "Libra": {
    "story": "Libra's story begins with the White Knight, saturated in ideals, wanting to correct every wrong. The call of beauty pulls the story into the Dancer, who follows what is lovely and learns harmony with her whole body. The ideals sour, and the Black Knight takes justice into his own hands, rules without mercy, this week's principle making next week's enemy. Then he falls in love when he least expects it, the love rescues him from what he was becoming, and the Lover learns real exchange beyond fantasy. The love spills into creation, and the Artist turns feeling into visible form. The Ambassador carries the message of harmony to a wider audience, bridging sides without losing her spine. Then Libra is handed real authority, and the Judge must weigh evidence while noticing how much of his fairness is feeling, and where mercy has gone missing. In the end the Sacred Whore holds worth in her own body, giving and receiving as sacred exchange, valued without being owned.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Ideal",
        "body": "Libra Season begins with the question of balance. This is the part of the cycle where fairness, beauty, agreement, desire, and the space between people become more visible. The beginning asks you to notice the ideal without letting it flatten the truth. Harmony has to include what is real.",
        "summary": "Notice the ideal while letting fairness include truth.",
        "prompt": "What kind of balance am I actually seeking?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Harmony",
        "body": "By the Crescent Moon, the ideal starts moving through relationship, taste, rhythm, and response. You may notice what feels beautiful, agreeable, or easy to meet. This phase asks you to follow harmony without losing your own timing inside it.",
        "summary": "Follow harmony without losing your own rhythm.",
        "prompt": "Where am I adjusting, and does it still include me?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Imbalance",
        "body": "At the First Quarter Moon, Libra Season asks where politeness has covered a real imbalance. Something may need to be named plainly. The Moon asks you to stop using peacekeeping as a way to avoid truth. Repair begins where the nice version stops working.",
        "summary": "Name the imbalance beneath the politeness.",
        "prompt": "What needs to be said for balance to become real?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Real Exchange",
        "body": "By the Gibbous Moon, Libra Season becomes more specific about exchange. Love, desire, collaboration, or negotiation may ask for more honesty. This phase asks whether both sides are present, giving, receiving, and being changed by the relationship.",
        "summary": "Make the exchange mutual enough to be real.",
        "prompt": "Where does exchange need more honesty or reciprocity?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Beauty Mirror",
        "body": "The Full Moon shows what relationship has made visible. It can reveal love, projection, artifice, longing, aesthetic truth, or the places where beauty has been used to conceal discomfort. This is the emotional high point of Libra Season. The Moon asks you to let beauty reveal instead of hide.",
        "summary": "Let beauty reveal what is true instead of concealing it.",
        "prompt": "Where am I making something beautiful so I do not have to make it honest?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Bridge",
        "body": "After the Full Moon, the relational work moves outward. You may need to mediate, translate, invite, collaborate, or carry harmony into a wider field. This phase asks you to bridge without disappearing. A real mediator keeps a spine.",
        "summary": "Bridge with grace while keeping a spine.",
        "prompt": "Where can I create connection without abandoning my position?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Judgment",
        "body": "At the Last Quarter Moon, Libra Season reviews the decision point. Evidence, fairness, preference, hurt, and mercy may all be present. The Moon asks you to notice how much of your fairness is feeling, and how much room justice still has for grace.",
        "summary": "Review the judgment and leave room for mercy.",
        "prompt": "What would be fair if I included both truth and mercy?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Untethered Worth",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where worth separates from approval, desirability, agreement, or being chosen. The Moon asks you to keep the exchange sacred by remembering that your value is not owned by anyone else's response.",
        "summary": "Know your worth without outsourcing it to being desired.",
        "prompt": "Where am I ready to stop bargaining for worth?"
      }
    ]
  },
  "Scorpio": {
    "story": "Scorpio's story begins with the Raging Moon, a child whose feelings arrive as force before they have words. She realizes power requires knowledge and becomes the Blood Moon's student, up to her elbows in the dark, studying pain to learn how it works. The knowledge earns her the axe: the Executioner punishes the guilty and enjoys it, until the day he knows the ruling is wrong and must choose between mercy and the job. He steps back into the shadows as the Cloaked One, containing what he knows, learning strategy and silence. The depth matures into the Priestess, keeping the mysteries in her temple while the people come to her. She looks out at their suffering and becomes the Witch, taking the dark medicine to the ones who need it most. Then something stronger than she is breaks her, and the Madwoman learns the lesson she resisted longest: she cannot recover alone, and the people she once helped carry her back. In the end the Phoenix rises from the wreckage, and the new life is genuinely new.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Intensity",
        "body": "Scorpio Season begins where feeling becomes force. This is the part of the cycle where pressure, secrecy, desire, fear, trust, and truth start moving beneath the surface. The beginning asks you to let intensity become information before it becomes a weapon.",
        "summary": "Let intensity become information before it becomes a weapon.",
        "prompt": "What feeling is arriving with more force than words?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Descent",
        "body": "By the Crescent Moon, the feeling starts asking for deeper study. You may notice pain, attachment, jealousy, curiosity, or the pull to look under the surface. This phase asks you to study the dark without becoming ruled by it. Knowledge is not the same as control.",
        "summary": "Study what is hidden without letting it rule you.",
        "prompt": "What am I ready to look at more honestly?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Power Test",
        "body": "At the First Quarter Moon, Scorpio Season asks how you use power when the stakes feel high. You may want to punish, cut off, expose, retaliate, or make a final ruling. The Moon asks you to check the strike. Power becomes cleaner when mercy is still available.",
        "summary": "Check the strike before power becomes punishment.",
        "prompt": "Where do I need truth without retaliation?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Containment",
        "body": "By the Gibbous Moon, the work becomes containment. Not everything private is unhealthy, and not everything hidden is protected. This phase asks you to keep what is sacred contained without letting secrecy run the whole story.",
        "summary": "Protect what is sacred without hiding from the truth.",
        "prompt": "What needs privacy, and what needs honesty?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Depth Mirror",
        "body": "The Full Moon shows what depth has revealed. It can expose trust, betrayal, desire, grief, medicine, or the places where control has replaced intimacy. This is the emotional high point of Scorpio Season. The Moon asks you to serve truth with your depth instead of using it to dominate.",
        "summary": "Use depth to serve truth, not to control intimacy.",
        "prompt": "Where has control replaced trust?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Medicine",
        "body": "After the Full Moon, the medicine moves outward. Something you have learned through pain, shadow, or survival may be useful to others. This phase asks you to offer it with consent and proportion. Not everyone needs the whole underworld at once.",
        "summary": "Share the medicine with consent and proportion.",
        "prompt": "What truth can help if I offer it carefully?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Breaking Point",
        "body": "At the Last Quarter Moon, Scorpio Season reviews what has become too heavy to hold alone. The Moon asks you to notice the edge before collapse turns into the only language left. Let steadier hands help. Recovery cannot be controlled into existence.",
        "summary": "Notice what is too heavy to hold alone.",
        "prompt": "Where do I need help before the breaking point?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The New Life",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where transformation either becomes real, or becomes another dramatic story about the past. The Moon asks you to let what burned stay burned, and to make the new life actually new.",
        "summary": "Let what burned stay burned. Make the new life new.",
        "prompt": "What old intensity am I ready to stop reviving?"
      }
    ]
  },
  "Sagittarius": {
    "story": "Sagittarius's story begins with the Gypsy, wandering without a care, lucky and light. The steps turn purposeful and the Traveler picks routes and reasons. Then comes the crisis of faith: the Seeker knows she is searching for something real, does not know what it is, and must learn that the searching is the life. She turns to the books, and the Scholar digs through everything already written. The Divine finally touches him through the texts, and the Priest dedicates himself to the faith he found. Age brings the question why, and the Philosopher steps past what is written into open conversation with the universe. When the world rejects his beliefs, sharpest from the people who once believed beside him, the Hunter is tempted to stop searching and start hunting the doubters. In the end the Shaman heals the oldest split: where the Hunter wore the skin as a trophy, the Shaman wears it to meet the animal's spirit, at home in both worlds at once.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "The First Horizon",
        "body": "Sagittarius Season begins with the pull toward more: more truth, movement, meaning, distance, or possibility. This is the part of the cycle where the road starts calling before the destination is clear. The beginning asks you to follow curiosity without pretending wandering is the same as direction.",
        "summary": "Let the horizon call without pretending wandering is direction.",
        "prompt": "What horizon is beginning to call me?"
      },
      {
        "phase": "Crescent Moon",
        "figure": "The First Route",
        "body": "By the Crescent Moon, the road starts asking for a route. You may notice a direction, invitation, study, trip, risk, or truth that wants pursuit. This phase asks you to choose a path without demanding that it explain the whole meaning before you begin.",
        "summary": "Choose a route and let movement teach you.",
        "prompt": "What direction wants a real first step?"
      },
      {
        "phase": "First Quarter",
        "figure": "The Faith Test",
        "body": "At the First Quarter Moon, Sagittarius Season reaches the crisis of belief. You may know you are searching for something real without knowing what it is yet. The Moon asks you to ask the question honestly and resist the urge to turn uncertainty into a premature answer.",
        "summary": "Ask the honest question before forcing an answer.",
        "prompt": "What belief is being tested by my actual life?"
      },
      {
        "phase": "Gibbous Moon",
        "figure": "The Map",
        "body": "By the Gibbous Moon, the search needs study, context, and better maps. Books, teachers, traditions, and evidence can help, but this phase asks you to keep the map answering to the road. Knowledge should widen the world, not replace direct contact with it.",
        "summary": "Study the map while staying answerable to the road.",
        "prompt": "What do I need to learn before I claim certainty?"
      },
      {
        "phase": "Full Moon",
        "figure": "The Belief Mirror",
        "body": "The Full Moon shows what you believe when belief becomes visible. It can reveal faith, conviction, arrogance, inspiration, or the places where meaning has become too rigid to stay alive. This is the emotional high point of Sagittarius Season. The Moon asks you to keep the faith humble enough to keep growing.",
        "summary": "Let belief become visible without hardening into certainty.",
        "prompt": "Where does my belief need humility?"
      },
      {
        "phase": "Disseminating Moon",
        "figure": "The Bigger Question",
        "body": "After the Full Moon, the meaning moves outward. You may be teaching, debating, preaching, exploring, or asking why out loud. This phase asks you to keep the conversation open past what is already written down. Truth grows when it can keep meeting the world.",
        "summary": "Ask why out loud and keep the conversation open.",
        "prompt": "What question is bigger than the answer I already have?"
      },
      {
        "phase": "Last Quarter",
        "figure": "The Certainty Trap",
        "body": "At the Last Quarter Moon, Sagittarius Season reviews where conviction has become a weapon. You may be tempted to hunt the doubters, win the argument, or defend the belief more than the truth. The Moon asks you to lower the bow and check the target.",
        "summary": "Lower the bow when conviction becomes a weapon.",
        "prompt": "Where am I defending certainty instead of seeking truth?"
      },
      {
        "phase": "Balsamic Moon",
        "figure": "The Living Wisdom",
        "body": "At the Balsamic Moon, the season begins to empty out. This is where belief becomes lived wisdom, or remains a story you tell about yourself. The Moon asks you to bridge the worlds you split and live the balance you preach.",
        "summary": "Let belief become lived wisdom.",
        "prompt": "What truth am I ready to practice instead of only proclaim?"
      }
    ]
  }
};

export function seasonArcCopyForSign(sign: string) {
  return seasonArcCopyBySign[sign] ?? null;
}
