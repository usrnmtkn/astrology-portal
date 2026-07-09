export type SeasonArcPhase = { phase: string; figure: string | null; body: string };

export type SeasonArcCopy = { story: string; phases: SeasonArcPhase[] };

export const seasonArcCopyBySign: Record<string, SeasonArcCopy> = {
  "Capricorn": {
    "story": "Capricorn's story begins with the Forgotten One, the child nobody noticed. Undervalued and overlooked, he starts building his own way up because no one else is coming for him. Eventually he steps out of the shadows, picks his mountain, and begins the climb. Partway up, he spots silver in the rock and abandons the climb to dig, telling himself the wealth will buy him the respect the summit would have earned. The way out of that tunnel is craft: he brings the metal up and learns to shape it, and for the first time the work matters more than what it sells for. The work carries him to authority. He becomes the elder of the family, holding everyone through structure and duty, providing without rest. But when the respect he expected doesn't come back the way he wanted, he starts withholding, keeping score, gripping what he built. He sits on the hoard so long he becomes the Dragon: still guarding the treasure, but what he hoards now is wisdom, given out carefully to the few who prove they can carry it.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Forgotten One's Moon",
        "body": "The beginning. Nobody is watching, and nobody is coming. What you build now, you build for yourself."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Mountain Climber's Moon",
        "body": "You've picked the mountain. The climb has started and the direction is set."
      },
      {
        "phase": "First Quarter",
        "figure": "Miner's Moon",
        "body": "You've hit the silver in the rock. Watch what you abandon to dig, and what you're trying to buy instead of earn."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Smith's Moon",
        "body": "The way out of the tunnel is craft. Shape what you dug up until the work itself is the point."
      },
      {
        "phase": "Full Moon",
        "figure": "Grandmother's Moon",
        "body": "The authority is yours now. Hold the people you're responsible for without letting duty replace tenderness."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Grandfather's Moon",
        "body": "You're providing outward, carrying the load in public. Notice what you expect back for it."
      },
      {
        "phase": "Last Quarter",
        "figure": "Miser's Moon",
        "body": "The respect didn't come the way you wanted. Check what you're withholding and what score you're keeping."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Dragon's Moon",
        "body": "You're sitting on everything you gathered. Decide what wisdom gets passed on, and to whom."
      }
    ]
  },
  "Aquarius": {
    "story": "Aquarius's story begins with the Father's Son, the Golden Boy, told from birth that he is special and playing the part so fluently he loses track of what he feels. His sister the Father's Daughter proves herself in the Father's world, casting her loyalty outward and leaving half of herself behind to earn it. Then the model breaks, and the Rebel throws out everything connected to the old authority, the useful parts included, saved only by friends he respects enough to let them disagree. The Trickster learns subtler tools, turning the system sideways to reveal its hidden assumptions. What he finds on the other side is the Friendship Moon: community, chosen family, connection between equals. The Apostle carries the doctrine of hope outward to anyone who will hear it. Then he says the thing the group cannot accept, and the Heretic is cast out of the home he fought to earn, learning that free choice means being able to walk away from anything. In the end the Prophet is found again in his last years, asked about the future, telling it whether or not they believe.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Father's Son Moon",
        "body": "You're the favorite, playing the part well. Find out what you actually feel underneath it."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Father's Daughter Moon",
        "body": "You're proving yourself in the model's world. Notice what gets left behind to earn the approval."
      },
      {
        "phase": "First Quarter",
        "figure": "Rebel Moon",
        "body": "The break. Make it a decision, not a reaction, and keep the friends who can argue with you."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Trickster's Moon",
        "body": "Turn the system sideways and see what falls out. Give the mischief a purpose."
      },
      {
        "phase": "Full Moon",
        "figure": "Friendship Moon",
        "body": "The community is real. Stay human inside the collective."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Apostle's Moon",
        "body": "Carry the hope outward, and keep listening while you share it."
      },
      {
        "phase": "Last Quarter",
        "figure": "Heretic's Moon",
        "body": "They cast you out for saying it. Don't stay anywhere you must hide what you believe."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Prophet's Moon",
        "body": "Speak to the future from your distance, but stay in the present enough to matter."
      }
    ]
  },
  "Pisces": {
    "story": "Pisces's story begins with the Dreamer, the child who lives half in another world. When it is time to choose a direction, she chooses the more tempting one, and the Mermaid disappears into the water of the fantasy world. She is taken captive, her energy drained away for other people's benefit, and the Martyr learns both the worth of sacrifice and its hidden hook: the quiet superiority, the power of being needed. The feeling finds form, and the Poet translates what ordinary speech cannot hold. Then the great turn: instead of being drained, the Healer opens himself upward to something greater, and the energy flows through him instead of out of him. The Angel of Mercy swears to keep caring, tending the suffering of the world day after day. The vow costs everything, and the Lost Soul goes gray and empty, saved only by hope borrowed from watching the strong keep fighting. In the end the Mystic reaches up one last time and finally touches what always slipped away: the mystery itself, which deepens the human life instead of replacing it.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Dreamer's Moon",
        "body": "Half in the other world. Honor the dream and give it a vessel."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Mermaid Moon",
        "body": "The fantasy ocean is more tempting than the shore. Let the longing make something."
      },
      {
        "phase": "First Quarter",
        "figure": "Martyr's Moon",
        "body": "The giving has crossed the line. Give cleanly and keep enough to live on."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Poet's Moon",
        "body": "Turn the feeling into symbol. Don't let the poem replace the tending."
      },
      {
        "phase": "Full Moon",
        "figure": "Healer's Moon",
        "body": "Stop being drained. Open up and let the mercy come through you instead."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Moon of the Angel of Mercy",
        "body": "Serve the suffering, and include yourself in the mercy."
      },
      {
        "phase": "Last Quarter",
        "figure": "Moon of Lost Souls",
        "body": "Nothing left, and fog everywhere. Stop forcing clarity and rest near the strong."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Mystic's Moon",
        "body": "Touch the mystery. Let it deepen the human life instead of replacing it."
      }
    ]
  },
  "Aries": {
    "story": "Aries's story begins with the Infant, brand new and hungry, wanting everything now. The wanting finds a cause, and the Torch-Bearer runs laughing after an ideal worth following. The world knocks the ideal down enough times that the Brigand appears, angry and cynical, striking first, still believing underneath. Robbing people does nothing for his self-respect, so he decides he can do better than this and becomes the Adventurer, testing himself against bigger things: endurance, danger, feats of nerve. The tests forge him into the Warrior, who fights in the open, in honor, for a cause worth protecting. The Warrior learns the cause is bigger than one fighter and joins the ranks as the Soldier, giving his fire to a mission and learning to fight beside others. The war ends and the Survivor comes home carrying it, angry at everyone who expects him to be over it, learning that courage now means admitting the damage and healing without a schedule. In the end he is the Veteran, retired from the front lines, scarred and clear-eyed, telling the truth about the fight without making it glorious.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Infant's Moon",
        "body": "Everything is new and the wanting is immediate. Start before you talk yourself out of it, but wanting isn't permission."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Torch-Bearer's Moon",
        "body": "The fire has found a cause. Choose carefully what you follow."
      },
      {
        "phase": "First Quarter",
        "figure": "Brigand's Moon",
        "body": "The world hit back and the anger is up. Check whether the person in front of you earned it."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Adventurer's Moon",
        "body": "Test yourself against something bigger than a grudge."
      },
      {
        "phase": "Full Moon",
        "figure": "Warrior's Moon",
        "body": "Fight in the open, for something worth protecting."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Soldier's Moon",
        "body": "Your fight joins others now. Keep your conscience inside the mission."
      },
      {
        "phase": "Last Quarter",
        "figure": "Survivor's Moon",
        "body": "The fight is over but the habits aren't. Start the healing without a schedule."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Veteran's Moon",
        "body": "Retired from the front lines. Tell the truth about the fight without polishing it."
      }
    ]
  },
  "Taurus": {
    "story": "Taurus's story begins with the Dryad, who belongs to the land and the body, not yet separate from the living world. She learns to plant on purpose and becomes the Gardener, tending what she chose to grow. Needing more room and more money, the Woodcutter cuts down the woods he came from, choosing his own survival over what he used to belong to. He plants again on the cleared land and becomes the Farmer, working with cycles, weather, and yield. The harvest grows until she is the Earth Mother, generous enough to feed and hold everyone who comes. The abundance turns outward and the Builder makes things that last, roofs and walls for people who have none. Then the earning becomes its own goal, and the Merchant has to learn what things actually cost and what they return. In the end the Ancestor sorts the whole estate: what was built, what was kept, and what deserves to be passed down.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Dryad's Moon",
        "body": "You belong to the body and the land. Start with what's real enough to touch."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Gardener's Moon",
        "body": "The tending has begun. Growth needs patience and repeated care."
      },
      {
        "phase": "First Quarter",
        "figure": "Woodcutter's Moon",
        "body": "The bargain point: something real gets cleared or sold to keep going. See the trade plainly."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Farmer's Moon",
        "body": "Stewardship. Work with the cycle, not against it."
      },
      {
        "phase": "Full Moon",
        "figure": "Earth Mother's Moon",
        "body": "The harvest is visible and there's enough to hold others. Give without owning."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Builder's Moon",
        "body": "Build something that outlasts you and share it."
      },
      {
        "phase": "Last Quarter",
        "figure": "Merchant's Moon",
        "body": "Do the accounting. Keep what's worth the price and release what isn't."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Ancestor's Moon",
        "body": "Sort the inheritance. Decide what gets passed down."
      }
    ]
  },
  "Gemini": {
    "story": "Gemini's story begins with the Little Brother, who learns by watching, copying, and asking questions. His twin the Little Sister learns the social side, using words as relationship and reading the room. Then words discover their power to bend things, and the Liar spins versions until even he can't remember which one is true. The words go professional, and the Mercenary sells his skill to whoever pays, learning the hard way what flexible ethics cost. Out of all of it comes the Storyteller, who holds every lie and all the imagination, and knows that how a thing is told shapes what it becomes. The Scribe writes it down, records, copies, and carries knowledge outward. The Magician discovers the words have been shaping reality itself, and that he has been exempting himself from every rule he applies to others. In the end the Teacher takes everything the words did, right and wrong, and translates it so someone else can carry it.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Little Brother's Moon",
        "body": "Everything is a question. Learn by asking and trying words on."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Little Sister's Moon",
        "body": "The words are social now. Say what you mean, not just what lands."
      },
      {
        "phase": "First Quarter",
        "figure": "Liar's Moon",
        "body": "The words have bent. Find the one lie you've told yourself and face what's under it."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Mercenary's Moon",
        "body": "Skill for hire. Keep the ethics attached to the cleverness."
      },
      {
        "phase": "Full Moon",
        "figure": "Storyteller's Moon",
        "body": "Tell the story so it reveals the truth instead of replacing it."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Scribe's Moon",
        "body": "Write it down. Pass the knowledge along."
      },
      {
        "phase": "Last Quarter",
        "figure": "Magician's Moon",
        "body": "Look at what your words built. Test your own framing the way you test everyone else's."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Teacher's Moon",
        "body": "Teach it. Meet the learner where they are."
      }
    ]
  },
  "Cancer": {
    "story": "Cancer's story begins with the Mother's Daughter, whose identity is still woven into her mother's, the self forming through being held. Her brother the Mother's Son already knows he is different from the mother, and that the difference will someday come between them. Then the unthinkable: home is lost, and the Orphan weeps behind walls built half for protection, half as a test to see who cares enough to get through. She grows into the Life-Giver, creating and tending life of her own, learning to make only what she can sustain. The care deepens until she is the Sea Mother, tidal and generous, able to hold everyone. Her mate the Shield-Father steps out the door to guard the shelter, turning feeling into defense. Loss comes again, this time to the adult, and the Widow chooses between building something from the grief or living locked inside the memories. In the end she is the Keeper of Memories. She guards the family's stories and keeps them accurate, instead of rewriting them, romanticizing them, or turning them into weapons, and she does the slow, deliberate work of forgiveness.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Mother's Daughter Moon",
        "body": "The self is still woven into the family feeling. Learn whose feeling is whose."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Mother's Son Moon",
        "body": "You're different from the ones who held you, and you know it. The bond survives by changing."
      },
      {
        "phase": "First Quarter",
        "figure": "Weeping Moon",
        "body": "The loss broke through. Let the feeling come, and let one person past the wall."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Life-Giver's Moon",
        "body": "You're the one tending life now. Only take on what you can sustain."
      },
      {
        "phase": "Full Moon",
        "figure": "Sea Mother's Moon",
        "body": "You can hold everyone. Don't confuse being needed with being loved."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Shield-Father's Moon",
        "body": "Step out the door and guard what you built, without controlling the people inside it."
      },
      {
        "phase": "Last Quarter",
        "figure": "Widow's Moon",
        "body": "Loss again, as an adult this time. Build something from the grief or the house goes quiet."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Keeper of Memories Moon",
        "body": "Keep the memories clean enough to be useful. Forgive on purpose."
      }
    ]
  },
  "Leo": {
    "story": "Leo's story begins with the Sun Child, shining and playing before self-consciousness arrives. He learns that people love to laugh, and the Clown performs, clumsy but sincere. The skill sharpens until the Actor can become whatever the audience wants, and starts losing track of where the roles end and he begins. He retreats to write his own songs, and the Singer discovers she misses the applause less than she feared. The voice carries her to the throne, and the Queen rules with warmth and presence, her danger the pride that keeps people at arm's length. The King turns outward, building alliances and providing, learning that being central is not the same as being useful. Then the crowd turns, and the Usurper's moment arrives: thrown down, or stepping down willingly so the people can eat. In the end the Bard returns to the stage with the experience of power behind him, using the voice to keep even rulers honest.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Sun Child's Moon",
        "body": "Shine before self-consciousness arrives. Play first."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Clown's Moon",
        "body": "You've learned what gets the laugh. Keep the charm sincere."
      },
      {
        "phase": "First Quarter",
        "figure": "Actor's Moon",
        "body": "The masks are winning. Decide what you'd sell yourself for."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Singer's Moon",
        "body": "Make your own songs. Sing from the center, not toward applause."
      },
      {
        "phase": "Full Moon",
        "figure": "Queen's Moon",
        "body": "Rule with warmth. Don't let pride keep people at a distance."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "King's Moon",
        "body": "Lead outward and provide. Being central isn't the same as being useful."
      },
      {
        "phase": "Last Quarter",
        "figure": "Usurper's Moon",
        "body": "The throne question. Some things cost less handed over than lost in a fight."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Bard's Moon",
        "body": "Back to the stage with everything you learned. Use the voice to check power, including your own."
      }
    ]
  },
  "Virgo": {
    "story": "Virgo's story begins with the Maiden, whole in herself, private and discerning. She leaves the walled garden not for company but for useful work, and the Apprentice learns through practice and mistakes. The skill curdles into the Counting Moon, a locked room where everything is measured, everyone's faults are tallied, and nothing chaotic gets in, including people. Life loses patience and shoves her into the Housewife's world, balancing tasks and humans at the same time. She emerges as the Spinner, first of the Fates, at the center of a web where small careful motions make the thread of a life. The Weaver, the second Fate, joins the threads into a tapestry, learning to work with others instead of holding every strand alone. The third Fate holds the scissors, and her job is the necessary no: cutting the cord, marking the line, accepting the resentment. In the end the Monk withdraws into a community of silence and work, where the service is clean and the solitude is chosen.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Maiden's Moon",
        "body": "Whole in yourself. Start simple and private."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Apprentice's Moon",
        "body": "Practice. The mistakes are the training."
      },
      {
        "phase": "First Quarter",
        "figure": "Counting Moon",
        "body": "The counting has taken over. Fix what's broken and let one imperfect thing out the door."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Housewife's Moon",
        "body": "Life shoved people into the workroom. Balance the tasks and the humans."
      },
      {
        "phase": "Full Moon",
        "figure": "Spinner's Moon",
        "body": "You're at the center of the web. See the whole cloth, not just the thread."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Weaver's Moon",
        "body": "Weave with others. Don't try to hold every thread alone."
      },
      {
        "phase": "Last Quarter",
        "figure": "Fate's Moon",
        "body": "Pick up the scissors. Say the necessary no and let them resent it."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Monk's Moon",
        "body": "Retreat into clean service. Make sure it's devotion, not avoidance."
      }
    ]
  },
  "Libra": {
    "story": "Libra's story begins with the White Knight, saturated in ideals, wanting to correct every wrong. The call of beauty pulls the story into the Dancer, who follows what is lovely and learns harmony with her whole body. The ideals sour, and the Black Knight takes justice into his own hands, rules without mercy, this week's principle making next week's enemy. Then he falls in love when he least expects it, the love rescues him from what he was becoming, and the Lover learns real exchange beyond fantasy. The love spills into creation, and the Artist turns feeling into visible form. The Ambassador carries the message of harmony to a wider audience, bridging sides without losing her spine. Then Libra is handed real authority, and the Judge must weigh evidence while noticing how much of his fairness is feeling, and where mercy has gone missing. In the end the Sacred Whore holds worth in her own body, giving and receiving as sacred exchange, valued without being owned.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "White Knight's Moon",
        "body": "The ideals are bright. Let fairness include truth."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Dancer's Moon",
        "body": "Follow what's beautiful, but keep your own rhythm in the dance."
      },
      {
        "phase": "First Quarter",
        "figure": "Black Knight's Moon",
        "body": "The politeness has cracked. Name the imbalance plainly."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Lover's Moon",
        "body": "Love has arrived and it changes things. Make it a real exchange."
      },
      {
        "phase": "Full Moon",
        "figure": "Artist's Moon",
        "body": "Turn the love into form. Let beauty reveal, not conceal."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Ambassador's Moon",
        "body": "Carry the harmony outward, and keep a spine while you mediate."
      },
      {
        "phase": "Last Quarter",
        "figure": "Judge's Moon",
        "body": "You're on the bench now. Notice how much of your fairness is feeling, and leave room for mercy."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Sacred Whore's Moon",
        "body": "Know your worth without outsourcing it to being desired."
      }
    ]
  },
  "Scorpio": {
    "story": "Scorpio's story begins with the Raging Moon, a child whose feelings arrive as force before they have words. She realizes power requires knowledge and becomes the Blood Moon's student, up to her elbows in the dark, studying pain to learn how it works. The knowledge earns her the axe: the Executioner punishes the guilty and enjoys it, until the day he knows the ruling is wrong and must choose between mercy and the job. He steps back into the shadows as the Cloaked One, containing what he knows, learning strategy and silence. The depth matures into the Priestess, keeping the mysteries in her temple while the people come to her. She looks out at their suffering and becomes the Witch, taking the dark medicine to the ones who need it most. Then something stronger than she is breaks her, and the Madwoman learns the lesson she resisted longest: she cannot recover alone, and the people she once helped carry her back. In the end the Phoenix rises from the wreckage, and the new life is genuinely new.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Raging Moon",
        "body": "The feeling arrives as force. Let intensity become information."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Blood Moon",
        "body": "Study the dark instead of being ruled by it."
      },
      {
        "phase": "First Quarter",
        "figure": "Executioner's Moon",
        "body": "The axe is in your hand. Check the strike, and speak for mercy when the ruling is wrong."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Cloaked One's Moon",
        "body": "Keep what's sacred contained, without letting secrecy run the show."
      },
      {
        "phase": "Full Moon",
        "figure": "Priestess's Moon",
        "body": "The depth is power now. Serve truth with it instead of dominating."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Witch's Moon",
        "body": "Take the medicine to the people who need it, with consent."
      },
      {
        "phase": "Last Quarter",
        "figure": "Madwoman's Moon",
        "body": "It got too heavy to hold alone. Let steadier hands help before the breaking point."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Phoenix Moon",
        "body": "Rise from what burned. Make the new life actually new."
      }
    ]
  },
  "Sagittarius": {
    "story": "Sagittarius's story begins with the Gypsy, wandering without a care, lucky and light. The steps turn purposeful and the Traveler picks routes and reasons. Then comes the crisis of faith: the Seeker knows she is searching for something real, does not know what it is, and must learn that the searching is the life. She turns to the books, and the Scholar digs through everything already written. The Divine finally touches him through the texts, and the Priest dedicates himself to the faith he found. Age brings the question why, and the Philosopher steps past what is written into open conversation with the universe. When the world rejects his beliefs, sharpest from the people who once believed beside him, the Hunter is tempted to stop searching and start hunting the doubters. In the end the Shaman heals the oldest split: where the Hunter wore the skin as a trophy, the Shaman wears it to meet the animal's spirit, at home in both worlds at once.",
    "phases": [
      {
        "phase": "New Moon",
        "figure": "Gypsy's Moon",
        "body": "Wander. Let the road pull you."
      },
      {
        "phase": "Crescent Moon",
        "figure": "Traveler's Moon",
        "body": "The steps turn purposeful. Pick a direction."
      },
      {
        "phase": "First Quarter",
        "figure": "Seeker's Moon",
        "body": "The crisis of faith. The searching is the life; ask the question honestly."
      },
      {
        "phase": "Gibbous Moon",
        "figure": "Scholar's Moon",
        "body": "Hit the books. Keep the map answering to the road."
      },
      {
        "phase": "Full Moon",
        "figure": "Priest's Moon",
        "body": "The belief is public now. Keep the faith alive enough to be humbled."
      },
      {
        "phase": "Disseminating Moon",
        "figure": "Philosopher's Moon",
        "body": "Ask why, out loud, past what's already written down."
      },
      {
        "phase": "Last Quarter",
        "figure": "Hunter's Moon",
        "body": "You've started hunting the doubters. Lower the bow and check the target."
      },
      {
        "phase": "Balsamic Moon",
        "figure": "Shaman's Moon",
        "body": "Bridge the worlds you split. Live the balance you preach."
      }
    ]
  }
};

export function seasonArcCopyForSign(sign: string) {
  return seasonArcCopyBySign[sign] ?? null;
}
