window.ASICC_SAMPLE=(function(){
const catalog=[
{id:'p1',ko:'김말이',fr:'Rouleaux d’algues',vendor:'업체 A',buy:24,pack:10,sale:5.5,boxes:4,limitMode:'auto',manualLimit:40,storage:'냉동',emoji:'🍘',koDesc:'바삭하게 튀겨 먹는 김말이',frDesc:'Rouleaux d’algues à frire',active:true},
{id:'p2',ko:'호떡',fr:'Hotteok',vendor:'업체 A',buy:21,pack:8,sale:6,boxes:3,limitMode:'auto',manualLimit:24,storage:'냉동',emoji:'🥞',koDesc:'달콤한 속이 들어 있는 호떡',frDesc:'Crêpes coréennes fourrées',active:true},
{id:'p3',ko:'떡볶이떡',fr:'Gâteaux de riz',vendor:'업체 B',buy:18,pack:12,sale:4.5,boxes:3,limitMode:'manual',manualLimit:30,storage:'냉장',emoji:'🍡',koDesc:'떡볶이용 쌀떡',frDesc:'Gâteaux de riz coréens',active:true},
{id:'p4',ko:'석박지',fr:'Kimchi de radis',vendor:'업체 B',buy:28,pack:8,sale:7,boxes:2,limitMode:'manual',manualLimit:10,storage:'냉장',emoji:'🥬',koDesc:'아삭한 석박지',frDesc:'Kimchi de radis',active:true},
{id:'p5',ko:'구운 김',fr:'Algues grillées',vendor:'업체 C',buy:30,pack:20,sale:3.5,boxes:3,limitMode:'auto',manualLimit:60,storage:'상온',emoji:'🍙',koDesc:'간편하게 먹는 구운 김',frDesc:'Feuilles d’algues grillées',active:true},
{id:'p6',ko:'보리차',fr:'Thé d’orge',vendor:'업체 C',buy:14,pack:15,sale:3,boxes:3,limitMode:'auto',manualLimit:45,storage:'상온',emoji:'🫖',koDesc:'보리차 티백',frDesc:'Thé d’orge en sachets',active:true}
];
const orders=[
{id:'BZ-2601',name:'김하나',date:'11/23 10:12',phone:'06 12 34 56 70',email:'hana@example.com',status:'reported',memo:'4시에 중학교 수업을 마치고 지윤이가 물품을 찾으러 갈 거예요!',items:[['김말이',4,5.5],['호떡',2,6],['석박지',2,7]]},
{id:'BZ-2602',name:'최유진',date:'11/23 10:48',phone:'06 12 34 56 71',email:'yujin@example.com',status:'unpaid',memo:'',items:[['김말이',2,5.5],['호떡',2,6]]},
{id:'BZ-2603',name:'Park Minji',date:'11/23 11:05',phone:'06 12 34 56 72',email:'minji@example.com',status:'confirmed',memo:'',items:[['김말이',5,5.5],['호떡',4,6]]},
{id:'BZ-2604',name:'Marie Dubois',date:'11/23 11:19',phone:'06 12 34 56 73',email:'marie@example.com',status:'reported',memo:'Merci de préparer le sachet séparément.',items:[['보리차',5,3]]},
{id:'BZ-2605',name:'이준',date:'11/23 11:35',phone:'06 12 34 56 74',email:'jun@example.com',status:'canceled',memo:'',items:[['김말이',2,5.5],['호떡',1,6],['석박지',2,7]]},
{id:'BZ-2606',name:'김소라',date:'11/23 12:03',phone:'06 12 34 56 75',email:'sora@example.com',status:'confirmed',memo:'남편이 대신 수령할 예정입니다.',items:[['호떡',5,6],['석박지',4,7]]},
{id:'BZ-2607',name:'장지수',date:'11/23 12:20',phone:'06 12 34 56 76',email:'jisoo@example.com',status:'unpaid',memo:'',items:[['김말이',3,5.5],['보리차',1,3]]},
{id:'BZ-2608',name:'정민아',date:'11/23 13:20',phone:'06 12 34 56 77',email:'mina@example.com',status:'confirmed',memo:'',items:[['김말이',4,5.5]]}];
return{catalog,orders};
})();
