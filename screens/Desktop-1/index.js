import React, {useState} from "react";
import "./index.css"
export default (props) => {
	const [input1, onChangeInput1] = useState('');
	const viewVertical = () => {
		return (
			<div className="box">
			</div>
		)
	}
	const image = () => {
		return (
			<img
				src={"https://i.imgur.com/1tMFzp8.png"} 
				className="image"
			/>
		)
	}
	return (
		<div className="contain">
			<div className="scroll-view">
				{viewVertical()}
				<div className="row-view">
					{image()}
					<span className="text" >
						{"NetSci"}
					</span>
					<div className="box2">
					</div>
					<span className="text2" >
						{"Setting"}
					</span>
					<span className="text3" >
						{"My Account"}
					</span>
					<span className="text4" >
						{"Help"}
					</span>
					<span className="text5" >
						{"About Us"}
					</span>
				</div>
				<div className="column">
					<span className="text6" >
						{"How can I help?"}
					</span>
					<div className="row-view2">
						<input
							placeholder={"Enter keywords..."}
							value={input1}
							onChange={(event)=>onChangeInput1(event.target.value)}
							className="input"
						/>
						<img
							src={"https://i.imgur.com/1tMFzp8.png"} 
							className="image2"
						/>
					</div>
				</div>
			</div>
		</div>
	)
}